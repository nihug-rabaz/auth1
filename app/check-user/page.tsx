'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CheckUser() {
  const [idNumber, setIdNumber] = useState('');
  const [result, setResult] = useState<{ isValid: boolean; mobilePhone?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!idNumber.trim()) {
      setError('מספר ת.ז. נדרש');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/users/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בבדיקה');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem', 
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link 
            href="/"
            style={{
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            ← חזרה לדף הבית
          </Link>
        </div>

        <h1 style={{ 
          fontSize: '2rem', 
          marginBottom: '2rem',
          color: '#333',
          textAlign: 'center'
        }}>
          בדיקת משתמש
        </h1>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#555'
          }}>
            מספר ת.ז.
          </label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="הכנס מספר ת.ז."
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontWeight: '600',
            marginBottom: '2rem'
          }}
        >
          {loading ? 'בודק...' : 'בדוק משתמש'}
        </button>

        {result && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: result.isValid ? '#f0fdf4' : '#fef2f2',
            borderRadius: '6px',
            border: `2px solid ${result.isValid ? '#10b981' : '#ef4444'}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              {result.isValid ? '✓' : '✗'}
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: result.isValid ? '#10b981' : '#ef4444',
              marginBottom: '0.5rem'
            }}>
              {result.isValid ? 'המשתמש קיים במערכת' : 'המשתמש לא קיים במערכת'}
            </div>
            {result.mobilePhone && (
              <div style={{
                fontSize: '1rem',
                color: '#666',
                marginTop: '0.5rem'
              }}>
                טלפון: {result.mobilePhone}
              </div>
            )}
            {result.error && (
              <div style={{
                fontSize: '0.9rem',
                color: '#ef4444',
                marginTop: '0.5rem'
              }}>
                {result.error}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #fecaca',
            color: '#991b1b',
            marginTop: '1rem'
          }}>
            <strong>שגיאה:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}

