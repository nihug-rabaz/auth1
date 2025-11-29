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
    
    return NextResponse.json({
      success: true,
      proxyUrl,
      testResponse: data,
      status: response.status,
      message: 'Proxy test successful'
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

