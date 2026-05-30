import toast from 'react-hot-toast';

export async function sendSessionCompletionEmail(userEmail: string, userName: string) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toEmail: userEmail,
        userName: userName,
        subject: "Your Becoming Reflection Journey is Complete",
        html: `
          <div style="font-family: monospace; color: #333;">
            <p><strong>Raw Truth.</strong></p>
            <p>Hello ${userName}, your deep reflection has been processed and your future trajectory is ready to be declared.</p>
            <p>Log in to <a href="https://becoming.app">Becoming</a> to review your analysis.</p>
          </div>
        `
      })
    });
    
    if (!res.ok) {
      throw new Error("Failed to send email");
    }
    
    toast.success('Analysis receipt sent to your email.');
    return true;
  } catch (err) {
    console.error('Failed to send email via SendGrid integration', err);
    return false;
  }
}
