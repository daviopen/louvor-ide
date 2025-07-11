import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '@/pages/HomePage'

// Mock dos serviços
vi.mock('@/services/database', () => ({
  getMusics: vi.fn(() => Promise.resolve([
    {
      id: '1',
      title: 'Amazing Grace',
      artist: 'John Newton',
      key: 'C',
      chords: ['C', 'Am', 'F', 'G'],
      lyrics: 'Amazing grace, how sweet the sound',
      tags: ['classic', 'hymn'],
      createdAt: '2023-12-01',
      updatedAt: '2023-12-01'
    },
    {
      id: '2',
      title: 'How Great Thou Art',
      artist: 'Carl Boberg',
      key: 'G',
      chords: ['G', 'C', 'D', 'Em'],
      lyrics: 'O Lord my God, when I in awesome wonder',
      tags: ['worship', 'hymn'],
      createdAt: '2023-12-02',
      updatedAt: '2023-12-02'
    }
  ]))
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title and search', async () => {
    renderWithRouter(<HomePage />)
    
    expect(screen.getByText('Cifras')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar por título, artista ou tag...')).toBeInTheDocument()
  })

  it('displays music cards after loading', async () => {
    renderWithRouter(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
      expect(screen.getByText('How Great Thou Art')).toBeInTheDocument()
    })
  })

  it('filters music by search term', async () => {
    renderWithRouter(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Buscar por título, artista ou tag...')
    fireEvent.change(searchInput, { target: { value: 'Amazing' } })

    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
      expect(screen.queryByText('How Great Thou Art')).not.toBeInTheDocument()
    })
  })

  it('filters music by key', async () => {
    renderWithRouter(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    })

    const keyFilter = screen.getByDisplayValue('Todos os tons')
    fireEvent.change(keyFilter, { target: { value: 'C' } })

    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
      expect(screen.queryByText('How Great Thou Art')).not.toBeInTheDocument()
    })
  })

  it('filters music by tag', async () => {
    renderWithRouter(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    })

    const tagFilter = screen.getByDisplayValue('Todas as tags')
    fireEvent.change(tagFilter, { target: { value: 'worship' } })

    await waitFor(() => {
      expect(screen.queryByText('Amazing Grace')).not.toBeInTheDocument()
      expect(screen.getByText('How Great Thou Art')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    renderWithRouter(<HomePage />)
    
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('shows empty state when no results found', async () => {
    renderWithRouter(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Buscar por título, artista ou tag...')
    fireEvent.change(searchInput, { target: { value: 'inexistente' } })

    await waitFor(() => {
      expect(screen.getByText('Nenhuma música encontrada')).toBeInTheDocument()
    })
  })

  it('handles error state gracefully', async () => {
    const getMusics = await import('@/services/database')
    vi.mocked(getMusics.getMusics).mockRejectedValueOnce(new Error('Network error'))
    
    renderWithRouter(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar músicas')).toBeInTheDocument()
    })
  })
})
