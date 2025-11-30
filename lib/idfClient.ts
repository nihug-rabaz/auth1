class IDFClient {
  private baseUrl: string = "https://my.idf.il";
  private defaultHeaders: Record<string, string>;

  constructor() {
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

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const headers = { ...this.defaultHeaders, ...options.headers };
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors'
    });

    return response;
  }

  async getUserInfo(idNumber: string): Promise<{ mobilePhone: string; sessionCookie: string }> {
    const url = `${this.baseUrl}/api/users/`;
    const payload = { idNumber };

    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    
    const cookies = response.headers.get('set-cookie') || '';
    let sessionCookie = '';
    if (cookies) {
      const cookieArray = cookies.split(';');
      const connectSidCookie = cookieArray.find(c => c.trim().startsWith('connect.sid='));
      if (connectSidCookie) {
        sessionCookie = connectSidCookie.trim();
      } else {
        sessionCookie = cookies.trim();
      }
    }

    return {
      mobilePhone: data.mobilePhone,
      sessionCookie: sessionCookie
    };
  }

  async validateCode(idNumber: string, code: string, sessionCookie: string): Promise<any> {
    const url = `${this.baseUrl}/api/users/${idNumber}/validateCode`;
    const payload = { code };
    
    const headers: Record<string, string> = { ...this.defaultHeaders };
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: 'include',
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
  }
}

export default IDFClient;

