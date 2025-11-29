import { NextResponse } from 'next/server';

export async function GET() {
  const proxyUrl = process.env.PROXY_URL;
  return NextResponse.json({
    proxyConfigured: !!proxyUrl,
    proxyUrl: proxyUrl || 'Not configured',
    message: proxyUrl 
      ? `Proxy is configured: ${proxyUrl}` 
      : 'No proxy configured. Set PROXY_URL environment variable.'
  });
}

