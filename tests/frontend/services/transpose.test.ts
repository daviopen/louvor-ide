import { describe, it, expect, vi } from 'vitest'
import { transposeChords, parseChords, getChordQuality } from '@/services/transpose'

describe('transposeChords', () => {
  it('transposes chords correctly up by semitones', () => {
    const chords = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']
    const result = transposeChords(chords, 'C', 'D')
    
    expect(result).toEqual(['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'])
  })

  it('transposes chords correctly down by semitones', () => {
    const chords = ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim']
    const result = transposeChords(chords, 'D', 'C')
    
    expect(result).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'])
  })

  it('handles complex chord progressions', () => {
    const chords = ['C', 'C/E', 'F', 'C/G', 'Am', 'F', 'C', 'G']
    const result = transposeChords(chords, 'C', 'G')
    
    expect(result).toEqual(['G', 'G/B', 'C', 'G/D', 'Em', 'C', 'G', 'D'])
  })

  it('preserves chord qualities (major, minor, diminished, etc.)', () => {
    const chords = ['Cmaj7', 'Dm7', 'Em7b5', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']
    const result = transposeChords(chords, 'C', 'F')
    
    expect(result).toEqual(['Fmaj7', 'Gm7', 'Am7b5', 'Bbmaj7', 'C7', 'Dm7', 'Em7b5'])
  })

  it('handles enharmonic equivalents correctly', () => {
    const chords = ['C#', 'Db']
    const result1 = transposeChords(chords, 'C', 'C#')
    const result2 = transposeChords(chords, 'C', 'Db')
    
    expect(result1).toEqual(['C#', 'D'])
    expect(result2).toEqual(['Db', 'D'])
  })

  it('handles slash chords correctly', () => {
    const chords = ['C/E', 'F/A', 'G/B', 'Am/C']
    const result = transposeChords(chords, 'C', 'D')
    
    expect(result).toEqual(['D/F#', 'G/B', 'A/C#', 'Bm/D'])
  })

  it('handles no transpose (same key)', () => {
    const chords = ['C', 'F', 'G', 'Am']
    const result = transposeChords(chords, 'C', 'C')
    
    expect(result).toEqual(['C', 'F', 'G', 'Am'])
  })
})

describe('parseChords', () => {
  it('extracts chords from lyrics with chord notation', () => {
    const lyrics = `
      [C]Amazing [Am]grace, how [F]sweet the [G]sound
      That [C]saved a [Am]wretch like [F]me[G]
      [C]I once was [Am]lost, but [F]now am [G]found
      Was [C]blind, but [F]now I [C]see[G]
    `
    
    const result = parseChords(lyrics)
    expect(result).toEqual(['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'F', 'C', 'G'])
  })

  it('handles complex chord notations', () => {
    const lyrics = `
      [Cmaj7]Beautiful [Dm7]song with [Em7b5]complex [Fmaj7]chords
      [G7]And some [Am7]slash [C/E]chords [F/A]too
    `
    
    const result = parseChords(lyrics)
    expect(result).toEqual(['Cmaj7', 'Dm7', 'Em7b5', 'Fmaj7', 'G7', 'Am7', 'C/E', 'F/A'])
  })

  it('removes duplicate chords', () => {
    const lyrics = `
      [C]Test [C]duplicate [Am]chords [Am]here
      [F]Another [F]test [G]end [G]
    `
    
    const result = parseChords(lyrics)
    expect(result).toEqual(['C', 'Am', 'F', 'G'])
  })

  it('returns empty array for lyrics without chords', () => {
    const lyrics = 'This is just text without any chord notations'
    
    const result = parseChords(lyrics)
    expect(result).toEqual([])
  })
})

describe('getChordQuality', () => {
  it('identifies major chords', () => {
    expect(getChordQuality('C')).toBe('major')
    expect(getChordQuality('Cmaj7')).toBe('major')
    expect(getChordQuality('CM7')).toBe('major')
  })

  it('identifies minor chords', () => {
    expect(getChordQuality('Cm')).toBe('minor')
    expect(getChordQuality('Cm7')).toBe('minor')
    expect(getChordQuality('Cmin')).toBe('minor')
  })

  it('identifies diminished chords', () => {
    expect(getChordQuality('Cdim')).toBe('diminished')
    expect(getChordQuality('C°')).toBe('diminished')
    expect(getChordQuality('Cm7b5')).toBe('diminished')
  })

  it('identifies augmented chords', () => {
    expect(getChordQuality('Caug')).toBe('augmented')
    expect(getChordQuality('C+')).toBe('augmented')
  })

  it('identifies dominant chords', () => {
    expect(getChordQuality('C7')).toBe('dominant')
    expect(getChordQuality('C13')).toBe('dominant')
    expect(getChordQuality('C9')).toBe('dominant')
  })

  it('handles slash chords', () => {
    expect(getChordQuality('C/E')).toBe('major')
    expect(getChordQuality('Cm/Eb')).toBe('minor')
    expect(getChordQuality('C7/E')).toBe('dominant')
  })
})
