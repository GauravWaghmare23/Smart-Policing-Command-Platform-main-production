// Import this FIRST in any seed script that creates demo/synthetic data.
// Demo seeds create accounts with a well-known password, so they must never run
// against a production environment by accident.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error(
    'Refusing to run a demo seed script with NODE_ENV=production.\n' +
    'These scripts create accounts with a known demo password.\n' +
    'If you really intend this, set ALLOW_DEMO_SEED=true for this one command.'
  );
  process.exit(1);
}
