import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const results = [];
const record = (provider, ok, detail) => results.push({ provider, ok, detail: String(detail).replace(/(?:sk|pk|whsec)_[A-Za-z0-9_-]+/g, '[redacted]') });
const requireEnv = (names) => { const missing = names.filter((name) => !process.env[name]); if (missing.length) throw new Error(`missing ${missing.join(', ')}`); };

async function payment() {
  try {
    requireEnv(['STRIPE_SECRET_KEY']);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    await stripe.balance.retrieve();
    record('payment', true, 'Stripe authentication succeeded');
  } catch (error) { record('payment', false, error.message); }
}

async function email() {
  try {
    requireEnv(['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']);
    const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 10_000, socketTimeout: 10_000 });
    await transport.verify();
    record('email', true, 'SMTP authentication succeeded (no message sent)');
  } catch (error) { record('email', false, error.message); }
}

async function storage() {
  try {
    requireEnv(['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']);
    const client = new S3Client({ region: process.env.S3_REGION, endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: Boolean(process.env.S3_ENDPOINT), credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
    await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
    record('storage', true, 'S3 bucket is reachable with supplied identity');
  } catch (error) { record('storage', false, error.message); }
}

async function webhook() {
  try {
    requireEnv(['STRIPE_WEBHOOK_SECRET']);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_configuration_only', { apiVersion: '2023-10-16' });
    const payload = JSON.stringify({ id: 'evt_smoke_configuration', object: 'event' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest('hex');
    stripe.webhooks.constructEvent(payload, `t=${timestamp},v1=${signature}`, process.env.STRIPE_WEBHOOK_SECRET);
    record('webhook signature', true, 'Synthetic Stripe signature verified locally');
  } catch (error) { record('webhook signature', false, error.message); }
}

await Promise.all([payment(), email(), storage(), webhook()]);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.provider}: ${result.detail}`);
if (results.some((result) => !result.ok)) process.exitCode = 1;
