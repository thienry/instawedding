import { beforeEach, expect, it, vi } from 'vitest'

import { sendOtpEmail } from './mail.js'

const sendMail = vi.hoisted(() => vi.fn(async () => ({})))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }))

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('GMAIL_USER', 'sender@x.test')
  vi.stubEnv('GMAIL_APP_PASSWORD', 'app-password')
  vi.stubEnv('NODE_ENV', 'production')
  sendMail.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

it('sends the code from the Gmail account', async () => {
  expect(await sendOtpEmail('mod@x.test', '123456')).toBe(true)
  expect(sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      from: expect.objectContaining({ address: 'sender@x.test' }),
      to: 'mod@x.test',
      text: expect.stringContaining('123456'),
    })
  )
})

it('reports a failed delivery', async () => {
  sendMail.mockRejectedValueOnce(new Error('Invalid login'))
  expect(await sendOtpEmail('mod@x.test', '123456')).toBe(false)
})

it('fails without credentials on deployments, and never logs the code', async () => {
  vi.stubEnv('GMAIL_APP_PASSWORD', '')
  expect(await sendOtpEmail('mod@x.test', '123456')).toBe(false)
  expect(console.info).not.toHaveBeenCalled()
  expect(sendMail).not.toHaveBeenCalled()
})

it('logs the code in local development without credentials', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('GMAIL_USER', '')
  expect(await sendOtpEmail('mod@x.test', '123456')).toBe(true)
  expect(console.info).toHaveBeenCalledWith(expect.stringContaining('123456'))
})
