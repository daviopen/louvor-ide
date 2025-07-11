import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Mock do Firebase
const mockFirebase = {
  initializeApp: vi.fn(),
  getFirestore: vi.fn(() => ({
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn()
  }))
}

vi.mock('firebase/app', () => mockFirebase)
vi.mock('firebase/firestore', () => mockFirebase)

// Mock Service Worker para APIs
const server = setupServer(
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.json({ status: 'ok' }))
  }),
  rest.post('/api/transpose', (req, res, ctx) => {
    return res(ctx.json({ 
      originalKey: 'C',
      targetKey: 'D',
      transposedChords: ['D', 'Em', 'F#m', 'G']
    }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
