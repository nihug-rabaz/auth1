import { NextResponse } from 'next/server';
import IDFProxy from '@/services/IDFProxy';

export async function GET() {
  const proxyUrl = process.env.PROXY_URL;
  
  if (!proxyUrl) {
    return NextResponse.json({
      success: false,
      error: 'No proxy configured'
    });
  }

  try {
    const proxy = new IDFProxy();
    
    const testUrl = 'https://api.ipify.org?format=json';
    const response = await (proxy as any).makeRequest(testUrl, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    const geoUrl = `https://ipapi.co/${data.ip}/json/`;
    let geoData = null;
    try {
      const geoResponse = await (proxy as any).makeRequest(geoUrl, {
        method: 'GET'
      });
      geoData = await geoResponse.json();
    } catch (geoError) {
      console.error('Failed to get geo data:', geoError);
    }
    
    return NextResponse.json({
      success: true,
      proxyUrl,
      testResponse: data,
      geoData: geoData,
      status: response.status,
      message: geoData?.country_code === 'IL' 
        ? 'Proxy is working and appears to be in Israel ✓' 
        : `Proxy is working but location is ${geoData?.country_name || 'unknown'} (IP: ${data.ip})`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      proxyUrl,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

