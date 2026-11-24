// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { VideoRecorderModal } from '@/components/capture/VideoRecorderModal'
import { setupBrowser } from '@/test/browser'

setupBrowser()

class FakeRecorder {
  static isTypeSupported = () => true
  state = 'inactive'
  mimeType = 'video/mp4'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() {
    this.state = 'recording'
  }
  // Like the browser, reports the end after stop() returns
  stop() {
    this.state = 'inactive'
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(['x']) })
      this.onstop?.()
    })
  }
}

const stopTrack = vi.fn()
const getUserMedia = vi.fn()
const onClose = vi.fn()
const onVideoRecorded = vi.fn()
const stream = { getTracks: () => [{ stop: stopTrack }] }

beforeEach(() => {
  vi.resetAllMocks()
  getUserMedia.mockResolvedValue(stream)
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
})

const modal = (isOpen = true) => (
  <VideoRecorderModal isOpen={isOpen} onClose={onClose} onVideoRecorded={onVideoRecorded} />
)

async function open() {
  const view = render(modal())
  await act(async () => {})
  return view
}

it('delivers the clip when the guest stops recording', async () => {
  await open()
  fireEvent.click(screen.getByLabelText('Iniciar gravação'))
  await act(async () => fireEvent.click(screen.getByLabelText('Parar gravação')))
  expect(onVideoRecorded).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
  expect(stopTrack).toHaveBeenCalled()
})

it('discards the clip when the guest leaves while recording', async () => {
  const { unmount } = await open()
  fireEvent.click(screen.getByLabelText('Iniciar gravação'))
  unmount()
  await act(async () => {})
  expect(onVideoRecorded).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  expect(stopTrack).toHaveBeenCalled()
})

it('turns off a camera that is ready only after closing', async () => {
  let ready = (_stream: unknown) => {}
  getUserMedia.mockReturnValue(new Promise((resolve) => (ready = resolve)))
  const { rerender } = await open()
  rerender(modal(false))
  await act(async () => ready(stream))
  expect(stopTrack).toHaveBeenCalledOnce()
})

it('keeps only the camera of the last request', async () => {
  let readyFirst = (_stream: unknown) => {}
  const stopFirst = vi.fn()
  getUserMedia.mockReturnValueOnce(new Promise((resolve) => (readyFirst = resolve)))
  const { rerender } = await open()
  rerender(modal(false))
  rerender(modal())
  await act(async () => {})
  await act(async () => readyFirst({ getTracks: () => [{ stop: stopFirst }] }))
  expect(stopFirst).toHaveBeenCalledOnce()
  expect(stopTrack).not.toHaveBeenCalled()
})

it('does not ask for the camera again after closing on a denied microphone', async () => {
  let deny = () => {}
  await open()
  getUserMedia.mockReturnValueOnce(
    new Promise((_, reject) => (deny = () => reject(new Error('denied'))))
  )
  fireEvent.click(screen.getByText('Sem Som'))
  fireEvent.click(screen.getByLabelText('Fechar gravador'))
  getUserMedia.mockClear()
  await act(async () => deny())
  expect(getUserMedia).not.toHaveBeenCalled()
})

it('reports a denied camera', async () => {
  getUserMedia.mockRejectedValue(new Error('denied'))
  await open()
  screen.getByText(/Permissão de câmera negada/)
})
