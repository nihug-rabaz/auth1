const cookieStore = new Map<string, string>();

class IDFProxy {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private proxyUrl: string | undefined;

  constructor(baseUrl: string = "https://rabaz.tempurl.co.il/", proxyUrl?: string) {
    this.baseUrl = baseUrl;
    this.proxyUrl = proxyUrl || process.env.PROXY_URL;
    if (this.proxyUrl) {
      console.log('Proxy configured:', this.proxyUrl);
    } else {
      console.log('No proxy configured - using direct requests (server should be in Israel)');
    }
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Referer': 'https://my.idf.il/',
      'origin': 'https://my.idf.il'
    };
  }

  private mergeHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return { ...this.defaultHeaders, ...customHeaders };
  }

  private extractCookies(response: Response): string {
    const cookies: string[] = [];
    
    try {
      const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
      
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        for (const cookieString of setCookieHeaders) {
          if (cookieString) {
            const parts = cookieString.split(';');
            if (parts.length > 0) {
              cookies.push(parts[0].trim());
            }
          }
        }
      }
      
      if (cookies.length === 0) {
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          const cookieStrings = setCookieHeader.split(',').map(s => s.trim());
          for (const cookieString of cookieStrings) {
            if (cookieString) {
              const parts = cookieString.split(';');
              if (parts.length > 0) {
                cookies.push(parts[0].trim());
              }
            }
          }
        }
      }
      
      const allHeaders = Array.from(response.headers.entries());
      for (const [key, value] of allHeaders) {
        if (key.toLowerCase() === 'set-cookie' && !cookies.some(c => value.includes(c.split('=')[0]))) {
          const cookieStrings = value.split(',').map(s => s.trim());
          for (const cookieString of cookieStrings) {
            if (cookieString) {
              const parts = cookieString.split(';');
              if (parts.length > 0) {
                cookies.push(parts[0].trim());
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting cookies:', error);
    }
    
    return cookies.join('; ');
  }

  async makeRequest(url: string, options: RequestInit, retries: number = 2): Promise<Response> {
    if (this.proxyUrl) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt} for proxy request`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          console.log('Using proxy:', this.proxyUrl, 'for URL:', url);
          
          const proxyUrlLower = this.proxyUrl.toLowerCase();
          let proxyAgent: any;
          
          if (proxyUrlLower.startsWith('socks5://') || proxyUrlLower.startsWith('socks4://')) {
            const { SocksProxyAgent } = await import('socks-proxy-agent');
            proxyAgent = new SocksProxyAgent(this.proxyUrl);
          } else {
            const { ProxyAgent } = await import('undici');
            proxyAgent = new ProxyAgent(this.proxyUrl);
          }
          
          const { fetch: undiciFetch } = await import('undici');
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const fetchOptions: any = {
            ...options,
            dispatcher: proxyAgent,
            signal: controller.signal
          };
          
          try {
            const response = await undiciFetch(url, fetchOptions);
            clearTimeout(timeoutId);
            console.log('Proxy request successful, status:', response.status);
            
            if (response.status >= 500 && attempt < retries) {
              console.log(`Server error ${response.status}, retrying...`);
              continue;
            }
            
            const responseHeaders = new Headers();
            const rawHeaders = response.headers as any;
            
            console.log('Undici response headers type:', typeof rawHeaders);
            console.log('Undici response headers:', rawHeaders);
            
            if (rawHeaders) {
              if (rawHeaders.raw && typeof rawHeaders.raw === 'object') {
                for (const key in rawHeaders.raw) {
                  const value = rawHeaders.raw[key];
                  if (Array.isArray(value)) {
                    value.forEach(v => responseHeaders.append(key, v));
                  } else if (value !== null && value !== undefined) {
                    responseHeaders.append(key, String(value));
                  }
                }
              } else if (typeof rawHeaders === 'object') {
                for (const key in rawHeaders) {
                  const value = rawHeaders[key];
                  const lowerKey = key.toLowerCase();
                  if (lowerKey === 'set-cookie') {
                    if (Array.isArray(value)) {
                      value.forEach(v => responseHeaders.append('set-cookie', v));
                    } else if (value !== null && value !== undefined) {
                      responseHeaders.append('set-cookie', String(value));
                    }
                  } else {
                    if (Array.isArray(value)) {
                      value.forEach(v => responseHeaders.append(key, v));
                    } else if (value !== null && value !== undefined) {
                      responseHeaders.set(key, String(value));
                    }
                  }
                }
              }
              
              if (rawHeaders instanceof Headers) {
                Array.from(rawHeaders.entries()).forEach(([key, value]) => {
                  if (key.toLowerCase() === 'set-cookie') {
                    responseHeaders.append('set-cookie', value);
                  } else {
                    responseHeaders.set(key, value);
                  }
                });
              }
            }
            
            const body = await response.arrayBuffer();
            const clonedResponse = new Response(body, {
              status: response.status,
              statusText: response.statusText || '',
              headers: responseHeaders
            });
            
            console.log('Cloned response headers set-cookie:', clonedResponse.headers.get('set-cookie'));
            console.log('Cloned response headers getSetCookie:', clonedResponse.headers.getSetCookie ? clonedResponse.headers.getSetCookie() : 'not available');
            
            return clonedResponse;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error: any) {
          console.error(`Proxy error (attempt ${attempt + 1}/${retries + 1}):`, error.message);
          
          if (attempt === retries) {
            console.error('All proxy attempts failed, falling back to direct request');
            break;
          }
        }
      }
      
      console.log('Falling back to direct request (no proxy)');
      const directResponse = await fetch(url, options);
      console.log('Direct response headers keys:', Array.from(directResponse.headers.keys()));
      console.log('Direct response set-cookie:', directResponse.headers.get('set-cookie'));
      console.log('Direct response getSetCookie:', directResponse.headers.getSetCookie ? directResponse.headers.getSetCookie() : 'not available');
      return directResponse;
    }
    console.log('No proxy configured, using direct request to:', url);
    const directResponse = await fetch(url, options);
    console.log('Direct response headers keys:', Array.from(directResponse.headers.keys()));
    console.log('Direct response set-cookie:', directResponse.headers.get('set-cookie'));
    console.log('Direct response getSetCookie:', directResponse.headers.getSetCookie ? directResponse.headers.getSetCookie() : 'not available');
    return directResponse;
  }

  async getUserInfo(idNumber: string): Promise<{ data: any; cookies: string }> {
    const url = `${this.baseUrl}/api/idf/users`;
    const payload = { idNumber };

    console.log('Sending direct request to:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IDF API error:', response.status, errorText);
      
      if (response.status === 504 || response.status === 502) {
        throw new Error(`Proxy/Server timeout error (${response.status}). The proxy may be down or slow. Try again or use a different proxy.`);
      }
      
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
    }

    console.log('=== RESPONSE HEADERS DEBUG ===');
    console.log('Response status:', response.status);
    console.log('Response headers keys:', Array.from(response.headers.keys()));
    console.log('All headers entries:');
    Array.from(response.headers.entries()).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('set-cookie header (get):', response.headers.get('set-cookie'));
    console.log('getSetCookie method exists:', typeof response.headers.getSetCookie === 'function');
    if (response.headers.getSetCookie) {
      console.log('getSetCookie result:', response.headers.getSetCookie());
    }
    console.log('================================');
    
    let cookies = this.extractCookies(response);
    console.log('Extracted cookies:', cookies);
    console.log('Cookies length:', cookies.length);
    
    const responseText = await response.text();
    console.log('=== RESPONSE BODY ===');
    console.log('Response body (raw):', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Response body (parsed):', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      data = {};
    }
    
    if (data.sessionCookie) {
      console.log('Found sessionCookie in response body:', data.sessionCookie);
      cookies = data.sessionCookie;
    }
    
    if (cookies) {
      cookieStore.set(idNumber, cookies);
    }

    return { data, cookies };
  }

  async validateId(idNumber: string): Promise<{ isValid: boolean; mobilePhone?: string; error?: string }> {
    try {
      const { data } = await this.getUserInfo(idNumber);
      
      if (data.mobilePhone && data.mobilePhone !== 'XXX-XXXX-X72') {
        return { isValid: true, mobilePhone: data.mobilePhone };
      }
      
      if (data.errorInZika === true) {
        return { isValid: false, error: 'User not valid' };
      }
      
      if (data.mobilePhone) {
        return { isValid: true, mobilePhone: data.mobilePhone };
      }
      
      return { isValid: false, error: 'Invalid response' };
    } catch (error: any) {
      if (error.message.includes('403')) {
        return { isValid: false, error: 'Geo-restriction: Access limited to certain geographical areas' };
      }
      return { isValid: false, error: error.message || 'Unknown error' };
    }
  }

  async validateCode(idNumber: string, code: string, cookies?: string): Promise<any> {
    const url = `${this.baseUrl}/api/users/${idNumber}/validateCode`;
    const payload = { code };
    const headers = this.mergeHeaders();

    const storedCookies = cookieStore.get(idNumber);
    const finalCookies = cookies || storedCookies || '';

    if (finalCookies) {
      headers['Cookie'] = finalCookies;
    }

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
  }
}

export default IDFProxy;

