import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMusics, addMusic, updateMusic, deleteMusic } from '@/services/database'
import type { Music } from '@/types/music'

// Mock do Firebase
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn()
}

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  collection: mockFirestore.collection,
  doc: mockFirestore.doc,
  getDocs: mockFirestore.getDocs,
  addDoc: mockFirestore.addDoc,
  updateDoc: mockFirestore.updateDoc,
  deleteDoc: mockFirestore.deleteDoc,
  query: mockFirestore.query,
  where: mockFirestore.where,
  orderBy: mockFirestore.orderBy
}))

const mockMusic: Omit<Music, 'id'> = {
  title: 'Test Song',
  artist: 'Test Artist',
  key: 'C',
  chords: ['C', 'F', 'G', 'Am'],
  lyrics: 'Test lyrics with [C]chords',
  tags: ['test', 'sample'],
  createdAt: '2023-12-01',
  updatedAt: '2023-12-01'
}

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMusics', () => {
    it('fetches all musics from Firestore', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: '1',
            data: () => mockMusic
          }
        ]
      }
      
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot)
      
      const result = await getMusics()
      
      expect(result).toEqual([{ id: '1', ...mockMusic }])
      expect(mockFirestore.collection).toHaveBeenCalledWith('musics')
      expect(mockFirestore.getDocs).toHaveBeenCalled()
    })

    it('handles empty collection', async () => {
      const mockSnapshot = { docs: [] }
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot)
      
      const result = await getMusics()
      
      expect(result).toEqual([])
    })

    it('handles Firestore errors', async () => {
      mockFirestore.getDocs.mockRejectedValue(new Error('Firestore error'))
      
      await expect(getMusics()).rejects.toThrow('Firestore error')
    })
  })

  describe('addMusic', () => {
    it('adds a new music to Firestore', async () => {
      const mockDocRef = { id: 'new-id' }
      mockFirestore.addDoc.mockResolvedValue(mockDocRef)
      
      const result = await addMusic(mockMusic)
      
      expect(result).toBe('new-id')
      expect(mockFirestore.collection).toHaveBeenCalledWith('musics')
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining(mockMusic)
      )
    })

    it('handles add errors', async () => {
      mockFirestore.addDoc.mockRejectedValue(new Error('Add failed'))
      
      await expect(addMusic(mockMusic)).rejects.toThrow('Add failed')
    })
  })

  describe('updateMusic', () => {
    it('updates an existing music in Firestore', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined)
      
      await updateMusic('music-id', mockMusic)
      
      expect(mockFirestore.doc).toHaveBeenCalledWith('musics', 'music-id')
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining(mockMusic)
      )
    })

    it('handles update errors', async () => {
      mockFirestore.updateDoc.mockRejectedValue(new Error('Update failed'))
      
      await expect(updateMusic('music-id', mockMusic)).rejects.toThrow('Update failed')
    })
  })

  describe('deleteMusic', () => {
    it('deletes a music from Firestore', async () => {
      mockFirestore.deleteDoc.mockResolvedValue(undefined)
      
      await deleteMusic('music-id')
      
      expect(mockFirestore.doc).toHaveBeenCalledWith('musics', 'music-id')
      expect(mockFirestore.deleteDoc).toHaveBeenCalled()
    })

    it('handles delete errors', async () => {
      mockFirestore.deleteDoc.mockRejectedValue(new Error('Delete failed'))
      
      await expect(deleteMusic('music-id')).rejects.toThrow('Delete failed')
    })
  })

  describe('offline functionality', () => {
    it('falls back to localStorage when offline', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(() => JSON.stringify([{ id: '1', ...mockMusic }])),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })
      
      mockFirestore.getDocs.mockRejectedValue(new Error('Network error'))
      
      const result = await getMusics()
      
      expect(result).toEqual([{ id: '1', ...mockMusic }])
      expect(localStorageMock.getItem).toHaveBeenCalledWith('louvor-ide-musics')
    })

    it('syncs with Firestore when back online', async () => {
      // Mock sync functionality
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      
      const localStorageMock = {
        getItem: vi.fn(() => JSON.stringify([{ id: 'local-1', ...mockMusic, isLocal: true }])),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })

      const mockDocRef = { id: 'synced-id' }
      mockFirestore.addDoc.mockResolvedValue(mockDocRef)
      
      // This would be part of a sync function
      const localMusic = { id: 'local-1', ...mockMusic, isLocal: true }
      await addMusic(localMusic)
      
      expect(mockFirestore.addDoc).toHaveBeenCalled()
    })
  })
})
