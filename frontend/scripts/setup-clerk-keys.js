const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const envPath = path.join(__dirname, '..', '.env.local');

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\nClerk keys → get them from: https://dashboard.clerk.com/last-active?path=api-keys\n');

  const pk = (await ask('Paste your Publishable Key (pk_...): ')).trim();
  const sk = (await ask('Paste your Secret Key (sk_...): ')).trim();
  rl.close();

  if (!pk || !sk) {
    console.log('Both keys are required. Exiting.');
    process.exit(1);
  }

  const content = `# Clerk – do not commit real keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${pk}
CLERK_SECRET_KEY=${sk}
`;

  fs.writeFileSync(envPath, content, 'utf8');
  console.log('\nWrote keys to .env.local. Restart the dev server (npm run dev) if it’s running.\n');
}

main();
