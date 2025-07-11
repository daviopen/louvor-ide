import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import MusicCard from '@/components/MusicCard'
import type { Music } from '@/types/music'

const mockMusic: Music = {
  id: '1',
  title: 'Amazing Grace',
  artist: 'John Newton',
  key: 'C',
  chords: ['C', 'Am', 'F', 'G'],
  lyrics: 'Amazing grace, how sweet the sound',
  tags: ['classic', 'hymn'],
  createdAt: '2023-12-01',
  updatedAt: '2023-12-01'
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('MusicCard', () => {
  it('renders music information correctly', () => {
    renderWithRouter(<MusicCard music={mockMusic} />)
    
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    expect(screen.getByText('John Newton')).toBeInTheDocument()
    expect(screen.getByText('Tom: C')).toBeInTheDocument()
  })

  it('displays tags correctly', () => {
    renderWithRouter(<MusicCard music={mockMusic} />)
    
    expect(screen.getByText('classic')).toBeInTheDocument()
    expect(screen.getByText('hymn')).toBeInTheDocument()
  })

  it('shows chord count', () => {
    renderWithRouter(<MusicCard music={mockMusic} />)
    
    expect(screen.getByText('4 acordes')).toBeInTheDocument()
  })

  it('calls onView when card is clicked', () => {
    const onView = vi.fn()
    renderWithRouter(<MusicCard music={mockMusic} onView={onView} />)
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(onView).toHaveBeenCalledWith(mockMusic)
  })

  it('applies correct CSS classes for styling', () => {
    renderWithRouter(<MusicCard music={mockMusic} />)
    
    const card = screen.getByRole('button')
    expect(card).toHaveClass('group', 'relative', 'bg-white')
  })

  it('handles missing artist gracefully', () => {
    const musicWithoutArtist = { ...mockMusic, artist: undefined }
    renderWithRouter(<MusicCard music={musicWithoutArtist} />)
    
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })

  it('handles empty tags array', () => {
    const musicWithoutTags = { ...mockMusic, tags: [] }
    renderWithRouter(<MusicCard music={musicWithoutTags} />)
    
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
    expect(screen.queryByText('classic')).not.toBeInTheDocument()
  })
})
