'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'validate'>('users');
  const [testIdNumber, setTestIdNumber] = useState('123456782');
  const [testCode, setTestCode] = useState('Ab123456');
  const [testSessionCookie, setTestSessionCookie] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [showFullResult, setShowFullResult] = useState(false);
  const [validationStep, setValidationStep] = useState<'check' | 'code'>('check');
  const [userValidated, setUserValidated] = useState(false);
  const [validateStep, setValidateStep] = useState<'check' | 'code'>('check');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://myidf.rabaz.co.il';

  const isValidIsraeliID = (id: string): boolean => {
    return /\d{9}/.test(id) && Array.from(id, Number).reduce((counter, digit, i) => {
      const step = digit * ((i % 2) + 1);
      return counter + (step > 9 ? step - 9 : step);
    }) % 10 === 0;
  };

  const isValidAuthCode = (code: string): boolean => {
    if (code.length !== 8) return false;
    
    const digits = code.match(/\d/g) || [];
    const letters = code.match(/[a-zA-Z]/g) || [];
    
    if (digits.length !== 6 || letters.length !== 2) return false;
    
    const hasUpperCase = /[A-Z]/.test(code);
    const hasLowerCase = /[a-z]/.test(code);
    
    if (!hasUpperCase || !hasLowerCase) return false;
    
    const firstTwo = code.substring(0, 2);
    const lastTwo = code.substring(6, 8);
    const isLettersAtStart = /^[a-zA-Z]{2}\d{6}$/.test(code);
    const isLettersAtEnd = /^\d{6}[a-zA-Z]{2}$/.test(code);
    
    return isLettersAtStart || isLettersAtEnd;
  };

  const handleTest = async () => {
    setTestError(null);
    setTestResult(null);
    setShowFullResult(false);

    if (!isValidIsraeliID(testIdNumber)) {
      setTestError('מספר ת.ז. לא תקין. אנא הזן מספר ת.ז. ישראלי תקין (9 ספרות).');
      return;
    }

    if (activeTab === 'validate' && validateStep === 'code') {
      if (!isValidAuthCode(testCode)) {
        setTestError('קוד אימות לא תקין. הקוד חייב להיות 8 תווים: 6 ספרות ו-2 אותיות (גדולה וקטנה) בתחילת או סוף הקוד.');
        return;
      }
    }

    setTestLoading(true);

    try {
      if (activeTab === 'users') {
        const validateResponse = await fetch(`${baseUrl}/api/users/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ idNumber: testIdNumber })
        });

        const validateData = await validateResponse.json();
        
        if (!validateResponse.ok) {
          throw new Error(validateData.error || 'שגיאה בבקשה');
        }

        setTestResult(validateData);
      } else {
        if (validateStep === 'check') {
          const response = await fetch(`${baseUrl}/api/idf/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idNumber: testIdNumber })
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'שגיאה בבקשה');
          }

          if (data.mobilePhone && data.sessionCookie) {
            setUserValidated(true);
            setTestResult(data);
            setTestSessionCookie(data.sessionCookie);
            setValidateStep('code');
          } else {
            setTestResult(data);
          }
        } else {
          if (!testSessionCookie) {
            throw new Error('נדרש sessionCookie. אנא בצע קודם בדיקת משתמש.');
          }

          const response = await fetch(`${baseUrl}/api/idf/validate-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              idNumber: testIdNumber,
              code: testCode,
              sessionCookie: testSessionCookie
            })
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'שגיאה בבקשה');
          }

          setTestResult(data);
        }
      }
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exampleCode1 = `fetch('${baseUrl}/api/idf/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    idNumber: '123456782'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Mobile Phone:', data.mobilePhone);
  console.log('Session Cookie:', data.sessionCookie);
})
.catch(error => {
  console.error('Error:', error);
});`;

  const exampleCode2 = `// שלב 1: קבלת sessionCookie
fetch('${baseUrl}/api/idf/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    idNumber: '123456782'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Mobile Phone:', data.mobilePhone);
  console.log('Session Cookie:', data.sessionCookie);
  
  // שלב 2: בדיקת קוד אימות עם ה-sessionCookie
  return fetch('${baseUrl}/api/idf/validate-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idNumber: '123456782',
      code: 'Ab123456',
      sessionCookie: data.sessionCookie
    })
  });
})
.then(response => response.json())
.then(data => {
  console.log('Validation Result:', data);
  if (data.isValid) {
    console.log('Token:', data.token);
    console.log('UPN:', data.upn);
  }
})
.catch(error => {
  console.error('Error:', error);
});`;

  const curlExample1 = `curl -X POST "${baseUrl}/api/idf/users" \\
  -H "Content-Type: application/json" \\
  -d '{"idNumber": "123456782"}'`;

  const curlExample2 = `# שלב 1: קבלת sessionCookie
curl -X POST "${baseUrl}/api/idf/users" \\
  -H "Content-Type: application/json" \\
  -d '{"idNumber": "123456782"}'

# שלב 2: בדיקת קוד אימות עם ה-sessionCookie
curl -X POST "${baseUrl}/api/idf/validate-code" \\
  -H "Content-Type: application/json" \\
  -d '{
    "idNumber": "123456782",
    "code": "Ab123456",
    "sessionCookie": "connect.sid=..."
  }'`;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#f1f5f9'
    }}>
      <nav style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#3b82f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            🔐
          </div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700',
            color: '#f1f5f9',
            margin: 0
          }}>
            IDF Authentication API
          </h1>
        </div>
        <Link 
          href="/demo"
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: '600',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
          }}
        >
          דמו אינטראקטיבי
        </Link>
      </nav>

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        padding: '3rem 2rem'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '3rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          marginBottom: '3rem',
          border: '1px solid #334155'
        }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1rem',
            color: '#f1f5f9',
            fontWeight: '700'
          }}>
            API לאימות משתמשי צה"ל
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#cbd5e1',
            lineHeight: '1.8',
            marginBottom: '0'
          }}>
            שירות API מקצועי לאימות משתמשים דרך מערכת צה"ל. 
            תוכל לבצע בדיקת משתמש או אימות מלא עם קוד SMS שנשלח לטלפון.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
           <button
             onClick={() => {
               setActiveTab('users');
               setShowFullResult(false);
               setTestResult(null);
               setUserValidated(false);
               setTestSessionCookie('');
               setTestCode('Ab123456');
             }}
            style={{
              flex: 1,
              padding: '1.25rem',
              backgroundColor: activeTab === 'users' ? '#3b82f6' : '#1e293b',
              color: '#f1f5f9',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: activeTab === 'users' ? '2px solid #3b82f6' : '2px solid #334155'
            }}
          >
            📱 בדיקת משתמש
          </button>
          <button
            onClick={() => {
              setActiveTab('validate');
              setShowFullResult(false);
              setTestResult(null);
              setValidateStep('check');
              setUserValidated(false);
              setTestSessionCookie('');
              setTestCode('Ab123456');
            }}
            style={{
              flex: 1,
              padding: '1.25rem',
              backgroundColor: activeTab === 'validate' ? '#3b82f6' : '#1e293b',
              color: '#f1f5f9',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: activeTab === 'validate' ? '2px solid #3b82f6' : '2px solid #334155'
            }}
          >
            ✅ אימות עם קוד SMS
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem',
              color: '#f1f5f9',
              fontWeight: '600'
            }}>
              {activeTab === 'users' ? '📱 בדיקת משתמש' : '✅ אימות עם קוד SMS'}
            </h3>
            <p style={{
              color: '#cbd5e1',
              marginBottom: '1.5rem',
              lineHeight: '1.6',
              fontSize: '0.95rem'
            }}>
              {activeTab === 'users' 
                ? 'שלח מספר ת.ז. לבדיקה אם המשתמש קיים במערכת.'
                : validateStep === 'check'
                  ? 'שלח מספר ת.ז. לבדיקה אם המשתמש קיים במערכת. אם המשתמש קיים, תוכל להמשיך לשלב אימות הקוד.'
                  : 'המשתמש נמצא במערכת. הזן את קוד האימות שהתקבל בטלפון.'}
            </p>

             {activeTab === 'users' && (
               <div style={{
                 backgroundColor: '#1e3a5f',
                 border: '1px solid #3b82f6',
                 borderRadius: '12px',
                 padding: '1.5rem',
                 marginBottom: '1.5rem'
               }}>
                 <h4 style={{
                   color: '#f1f5f9',
                   fontSize: '1rem',
                   fontWeight: '600',
                   marginBottom: '1rem',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.5rem'
                 }}>
                   💡 לוגיקת בדיקת משתמש
                 </h4>
                 <div style={{
                   color: '#cbd5e1',
                   fontSize: '0.9rem',
                   lineHeight: '1.8'
                 }}>
                   <div style={{ marginBottom: '1rem' }}>
                     <strong style={{ color: '#10b981' }}>✓ משתמש קיים:</strong>
                     <div style={{
                       backgroundColor: '#0f172a',
                       padding: '0.75rem',
                       borderRadius: '6px',
                       marginTop: '0.5rem',
                       direction: 'ltr',
                       textAlign: 'left',
                       fontFamily: 'monospace',
                       fontSize: '0.85rem',
                       color: '#10b981'
                     }}>
                       {`{
   "isValid": true,
   "mobilePhone": "XXX-XXXX-X48"
 }`}
                     </div>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                       אם התשובה מכילה <code style={{ color: '#3b82f6' }}>isValid: true</code> ו-<code style={{ color: '#3b82f6' }}>mobilePhone</code> - המשתמש קיים במערכת.
                     </div>
                   </div>
                   <div>
                     <strong style={{ color: '#ef4444' }}>✗ משתמש לא קיים:</strong>
                     <div style={{
                       backgroundColor: '#0f172a',
                       padding: '0.75rem',
                       borderRadius: '6px',
                       marginTop: '0.5rem',
                       direction: 'ltr',
                       textAlign: 'left',
                       fontFamily: 'monospace',
                       fontSize: '0.85rem',
                       color: '#ef4444'
                     }}>
                       {`{
   "isValid": false,
   "error": "Invalid response"
 }`}
                     </div>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                       אם התשובה מכילה <code style={{ color: '#ef4444' }}>isValid: false</code> או <code style={{ color: '#ef4444' }}>error</code> - המשתמש לא קיים במערכת.
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'validate' && (
               <div style={{
                 backgroundColor: '#1e3a5f',
                 border: '1px solid #3b82f6',
                 borderRadius: '12px',
                 padding: '1.5rem',
                 marginBottom: '1.5rem'
               }}>
                 <h4 style={{
                   color: '#f1f5f9',
                   fontSize: '1rem',
                   fontWeight: '600',
                   marginBottom: '1rem',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.5rem'
                 }}>
                   💡 לוגיקת אימות עם קוד SMS
                 </h4>
                 <div style={{
                   color: '#cbd5e1',
                   fontSize: '0.9rem',
                   lineHeight: '1.8'
                 }}>
                   <div style={{ marginBottom: '1.5rem' }}>
                     <strong style={{ color: '#3b82f6' }}>שלב 1 - בדיקת משתמש:</strong>
                     <div style={{
                       backgroundColor: '#0f172a',
                       padding: '0.75rem',
                       borderRadius: '6px',
                       marginTop: '0.5rem',
                       direction: 'ltr',
                       textAlign: 'left',
                       fontFamily: 'monospace',
                       fontSize: '0.85rem',
                       color: '#cbd5e1'
                     }}>
                       {`{
   "mobilePhone": "XXX-XXXX-X48",
   "sessionCookie": "connect.sid=..."
 }`}
                     </div>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                       כתוב מספר ת.ז. וקבל את פרטי המשתמש ו-<code style={{ color: '#3b82f6' }}>sessionCookie</code>. הקוקי נטען אוטומטית.
                     </div>
                   </div>

                   <div style={{ marginBottom: '1.5rem' }}>
                     <strong style={{ color: '#10b981' }}>✓ קוד אימות נכון:</strong>
                     <div style={{
                       backgroundColor: '#0f172a',
                       padding: '0.75rem',
                       borderRadius: '6px',
                       marginTop: '0.5rem',
                       direction: 'ltr',
                       textAlign: 'left',
                       fontFamily: 'monospace',
                       fontSize: '0.85rem',
                       color: '#10b981'
                     }}>
                       {`{
   "isValid": true,
   "token": "Bearer eyJ...",
   "isRegistered": true,
   "upn": "123456782@idf.il"
 }`}
                     </div>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                       קוד אימות תקין מחזיר <code style={{ color: '#3b82f6' }}>isValid: true</code>, <code style={{ color: '#3b82f6' }}>token</code>, ו-<code style={{ color: '#3b82f6' }}>upn</code>.
                     </div>
                   </div>

                   <div style={{ marginBottom: '1.5rem' }}>
                     <strong style={{ color: '#ef4444' }}>✗ קוד אימות לא נכון:</strong>
                     <div style={{
                       backgroundColor: '#0f172a',
                       padding: '0.75rem',
                       borderRadius: '6px',
                       marginTop: '0.5rem',
                       direction: 'ltr',
                       textAlign: 'left',
                       fontFamily: 'monospace',
                       fontSize: '0.85rem',
                       color: '#ef4444'
                     }}>
                       {`{
   "isValid": false,
   "token": ""
 }`}
                     </div>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                       קוד אימות שגוי מחזיר <code style={{ color: '#ef4444' }}>isValid: false</code> ו-<code style={{ color: '#ef4444' }}>token</code> ריק.
                     </div>
                   </div>

                   <div style={{
                     backgroundColor: '#0f172a',
                     padding: '1rem',
                     borderRadius: '8px',
                     border: '1px solid #3b82f6'
                   }}>
                     <strong style={{ color: '#f1f5f9', display: 'block', marginBottom: '0.75rem' }}>📋 כללי הקוד אימות:</strong>
                     <ul style={{
                       margin: 0,
                       paddingRight: '1.5rem',
                       fontSize: '0.85rem',
                       lineHeight: '1.8'
                     }}>
                       <li>אורך הקוד הוא <strong style={{ color: '#3b82f6' }}>8 תווים</strong></li>
                       <li>יש בדיוק <strong style={{ color: '#3b82f6' }}>6 ספרות</strong></li>
                       <li>יש בדיוק <strong style={{ color: '#3b82f6' }}>2 אותיות</strong></li>
                       <li>חייב להיות לפחות <strong style={{ color: '#3b82f6' }}>אות גדולה אחת</strong> ולפחות <strong style={{ color: '#3b82f6' }}>אות קטנה אחת</strong></li>
                       <li>שתי האותיות נמצאות <strong style={{ color: '#3b82f6' }}>בתחילת הקוד או בסופו</strong> (לא באמצע)</li>
                     </ul>
                     <div style={{
                       marginTop: '0.75rem',
                       padding: '0.5rem',
                       backgroundColor: '#1e3a5f',
                       borderRadius: '4px',
                       fontSize: '0.8rem',
                       color: '#cbd5e1'
                     }}>
                       <strong>⚠️ חשוב:</strong> הקפד על אותיות קטנות/גדולות ומספרים - הקוד רגיש לאותיות גדולות וקטנות!
                     </div>
                   </div>
                 </div>
               </div>
             )}
            
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              position: 'relative',
              border: '1px solid #334155'
            }}>
              <button
                onClick={() => copyToClipboard(activeTab === 'users' ? exampleCode1 : exampleCode2, 'code')}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              >
                {copiedCode === 'code' ? '✓ הועתק' : '📋 העתק קוד'}
              </button>
              <pre style={{
                color: '#10b981',
                margin: 0,
                fontSize: '0.9rem',
                overflowX: 'auto',
                fontFamily: '"Fira Code", "Courier New", monospace',
                direction: 'ltr',
                textAlign: 'left',
                paddingTop: '2.5rem'
              }}>
                <code>{activeTab === 'users' ? exampleCode1 : exampleCode2}</code>
              </pre>
            </div>

            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative',
              border: '1px solid #334155'
            }}>
              <button
                onClick={() => copyToClipboard(activeTab === 'users' ? curlExample1 : curlExample2, 'curl')}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              >
                {copiedCode === 'curl' ? '✓ הועתק' : '📋 העתק cURL'}
              </button>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>cURL:</strong>
              </div>
              <pre style={{
                color: '#cbd5e1',
                margin: 0,
                fontSize: '0.85rem',
                fontFamily: '"Fira Code", "Courier New", monospace',
                whiteSpace: 'pre-wrap',
                direction: 'ltr',
                textAlign: 'left',
                paddingTop: '0.5rem'
              }}>
                <code>{activeTab === 'users' ? curlExample1 : curlExample2}</code>
              </pre>
            </div>
          </div>

          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1.5rem',
              color: '#f1f5f9',
              fontWeight: '600'
            }}>
              🧪 בדיקת API
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#cbd5e1',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                מספר ת.ז.
              </label>
              <input
                type="text"
                value={testIdNumber}
                onChange={(e) => setTestIdNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                  direction: 'ltr',
                  textAlign: 'left'
                }}
                 placeholder="123456782"
              />
            </div>

             {activeTab === 'validate' && validateStep === 'code' && (
               <>
                 <div style={{ marginBottom: '1.5rem' }}>
                   <label style={{
                     display: 'block',
                     marginBottom: '0.5rem',
                     color: '#cbd5e1',
                     fontSize: '0.9rem',
                     fontWeight: '500'
                   }}>
                     קוד אימות
                   </label>
                   <input
                     type="text"
                     value={testCode}
                     onChange={(e) => setTestCode(e.target.value)}
                     style={{
                       width: '100%',
                       padding: '0.75rem',
                       backgroundColor: '#0f172a',
                       border: '1px solid #334155',
                       borderRadius: '8px',
                       color: '#f1f5f9',
                       fontSize: '1rem',
                       direction: 'ltr',
                       textAlign: 'left'
                     }}
                     placeholder="Ab123456"
                   />
                 </div>
                 {activeTab === 'validate' && validateStep === 'code' && testSessionCookie && (
                   <div style={{
                     padding: '0.75rem',
                     backgroundColor: '#1e3a5f',
                     border: '1px solid #3b82f6',
                     borderRadius: '8px',
                     marginBottom: '1.5rem',
                     fontSize: '0.85rem',
                     color: '#cbd5e1'
                   }}>
                     <strong style={{ color: '#10b981' }}>✓ Session Cookie נשמר אוטומטית</strong>
                   </div>
                 )}
               </>
             )}

            <button
              onClick={handleTest}
              disabled={testLoading}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: testLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: testLoading ? 0.6 : 1,
                marginBottom: '1.5rem'
              }}
              onMouseEnter={(e) => {
                if (!testLoading) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!testLoading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {testLoading ? '⏳ שולח...' : '🚀 שלח בקשה'}
            </button>

            {testError && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#7f1d1d',
                border: '1px solid #991b1b',
                borderRadius: '8px',
                color: '#fca5a5',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                <strong>שגיאה:</strong> {testError}
              </div>
            )}

            {testResult && (() => {
              const formatResult = (obj: any, showFull: boolean): any => {
                if (typeof obj !== 'object' || obj === null) return obj;
                
                const formatted: any = Array.isArray(obj) ? [] : {};
                
                for (const key in obj) {
                  const value = obj[key];
                  if (typeof value === 'string' && value.length > 10 && (key.toLowerCase().includes('token') || key.toLowerCase().includes('cookie'))) {
                    formatted[key] = showFull ? value : `${value.substring(0, 10)}...`;
                  } else if (typeof value === 'object' && value !== null) {
                    formatted[key] = formatResult(value, showFull);
                  } else {
                    formatted[key] = value;
                  }
                }
                
                return formatted;
              };

              const formattedResult = formatResult(testResult, showFullResult);
              const hasLongTokens = JSON.stringify(testResult).length > 200;

              return (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  direction: 'ltr',
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <strong style={{ color: '#f1f5f9' }}>תוצאה:</strong>
                    {hasLongTokens && (
                      <button
                        onClick={() => setShowFullResult(!showFullResult)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#334155',
                          color: '#f1f5f9',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                      >
                        {showFullResult ? 'פחות' : 'More'}
                      </button>
                    )}
                  </div>
                  <pre style={{
                    color: '#10b981',
                    margin: 0,
                    fontSize: '0.85rem',
                    fontFamily: '"Fira Code", "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto',
                    maxWidth: '100%',
                    wordBreak: 'break-all'
                  }}>
                    {JSON.stringify(formattedResult, null, 2)}
                  </pre>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          border: '1px solid #334155'
        }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1.5rem',
            color: '#f1f5f9',
            fontWeight: '600'
          }}>
            📋 פרטים טכניים
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>Base URL:</strong>
              <code style={{
                color: '#3b82f6',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {baseUrl}
              </code>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>Content-Type:</strong>
              <code style={{
                color: '#3b82f6',
                fontSize: '0.9rem',
                fontFamily: 'monospace'
              }}>
                application/json
              </code>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>CORS:</strong>
              <code style={{
                color: '#10b981',
                fontSize: '0.9rem',
                fontFamily: 'monospace'
              }}>
                Enabled (All Origins)
              </code>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>Method:</strong>
              <code style={{
                color: '#3b82f6',
                fontSize: '0.9rem',
                fontFamily: 'monospace'
              }}>
                POST
              </code>
            </div>
          </div>
          
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            border: '1px solid #3b82f6'
          }}>
            <h4 style={{
              color: '#f1f5f9',
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📥 סקריפט לבדיקת תקינות
            </h4>
            <p style={{
              color: '#cbd5e1',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              lineHeight: '1.6'
            }}>
              הורד סקריפט JavaScript המכיל פונקציות לבדיקת תקינות תעודת זהות ישראלית וקוד אימות.
            </p>
            <a
              href="/validation-utils.js"
              download="validation-utils.js"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
              }}
            >
              ⬇️ הורד validation-utils.js
            </a>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              direction: 'ltr',
              textAlign: 'left'
            }}>
              <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>שימוש:</strong>
              <pre style={{
                color: '#10b981',
                margin: 0,
                fontSize: '0.8rem',
                fontFamily: '"Fira Code", "Courier New", monospace',
                whiteSpace: 'pre-wrap',
                overflowX: 'auto'
              }}>
{`// בדיקת תעודת זהות
isValidIsraeliID('123456782'); // true

// בדיקת קוד אימות
isValidAuthCode('Ab123456'); // true
isValidAuthCode('123456Ab'); // true`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
