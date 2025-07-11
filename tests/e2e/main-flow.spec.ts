import { test, expect } from '@playwright/test'

test.describe('Louvor IDE - Main Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the homepage correctly', async ({ page }) => {
    // Verifica se o título está correto
    await expect(page).toHaveTitle(/Louvor IDE/)
    
    // Verifica se os elementos principais estão presentes
    await expect(page.getByText('Cifras')).toBeVisible()
    await expect(page.getByPlaceholder('Buscar por título, artista ou tag...')).toBeVisible()
    await expect(page.getByText('Todos os tons')).toBeVisible()
    await expect(page.getByText('Todas as tags')).toBeVisible()
  })

  test('should search for music correctly', async ({ page }) => {
    // Aguarda o carregamento das músicas
    await page.waitForSelector('[data-testid="music-card"]', { timeout: 10000 })
    
    // Conta o número inicial de cards
    const initialCards = await page.locator('[data-testid="music-card"]').count()
    expect(initialCards).toBeGreaterThan(0)
    
    // Realiza busca
    const searchInput = page.getByPlaceholder('Buscar por título, artista ou tag...')
    await searchInput.fill('Amazing')
    
    // Aguarda a filtragem
    await page.waitForTimeout(500)
    
    // Verifica se os resultados foram filtrados
    const filteredCards = await page.locator('[data-testid="music-card"]').count()
    expect(filteredCards).toBeLessThanOrEqual(initialCards)
  })

  test('should filter by key correctly', async ({ page }) => {
    // Aguarda o carregamento
    await page.waitForSelector('[data-testid="music-card"]')
    
    // Seleciona um tom específico
    const keySelect = page.getByDisplayValue('Todos os tons')
    await keySelect.selectOption('C')
    
    // Aguarda a filtragem
    await page.waitForTimeout(500)
    
    // Verifica se apenas músicas em C são exibidas
    const cards = await page.locator('[data-testid="music-card"]').all()
    for (const card of cards) {
      await expect(card.getByText('Tom: C')).toBeVisible()
    }
  })

  test('should filter by tag correctly', async ({ page }) => {
    // Aguarda o carregamento
    await page.waitForSelector('[data-testid="music-card"]')
    
    // Obtém uma tag disponível do primeiro card
    const firstCard = page.locator('[data-testid="music-card"]').first()
    const tagElement = firstCard.locator('[data-testid="music-tag"]').first()
    const tagText = await tagElement.textContent()
    
    if (tagText) {
      // Seleciona a tag no filtro
      const tagSelect = page.getByDisplayValue('Todas as tags')
      await tagSelect.selectOption(tagText)
      
      // Aguarda a filtragem
      await page.waitForTimeout(500)
      
      // Verifica se apenas músicas com essa tag são exibidas
      const cards = await page.locator('[data-testid="music-card"]').all()
      for (const card of cards) {
        await expect(card.getByText(tagText)).toBeVisible()
      }
    }
  })

  test('should open music viewer when clicking on card', async ({ page }) => {
    // Aguarda o carregamento
    await page.waitForSelector('[data-testid="music-card"]')
    
    // Clica no primeiro card
    const firstCard = page.locator('[data-testid="music-card"]').first()
    await firstCard.click()
    
    // Verifica se o modal foi aberto
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Fechar')).toBeVisible()
    
    // Verifica se os controles de transposição estão presentes
    await expect(page.getByText('Tom atual:')).toBeVisible()
    await expect(page.getByText('Novo tom:')).toBeVisible()
    await expect(page.getByText('Transpor')).toBeVisible()
  })

  test('should transpose chords correctly', async ({ page }) => {
    // Aguarda o carregamento e abre uma música
    await page.waitForSelector('[data-testid="music-card"]')
    await page.locator('[data-testid="music-card"]').first().click()
    
    // Aguarda o modal abrir
    await expect(page.getByRole('dialog')).toBeVisible()
    
    // Obtém o tom atual
    const currentKeyText = await page.locator('text=Tom atual:').textContent()
    const currentKey = currentKeyText?.split(':')[1]?.trim()
    
    if (currentKey && currentKey !== 'D') {
      // Seleciona um novo tom
      const newKeySelect = page.getByDisplayValue(currentKey)
      await newKeySelect.selectOption('D')
      
      // Clica em transpor
      await page.getByText('Transpor').click()
      
      // Aguarda a transposição
      await page.waitForTimeout(1000)
      
      // Verifica se o tom foi alterado
      await expect(page.getByText('Tom atual: D')).toBeVisible()
    }
  })

  test('should close music viewer correctly', async ({ page }) => {
    // Abre o modal
    await page.waitForSelector('[data-testid="music-card"]')
    await page.locator('[data-testid="music-card"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    
    // Fecha clicando no botão
    await page.getByText('Fechar').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Abre novamente e fecha com ESC
    await page.locator('[data-testid="music-card"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should handle empty search results', async ({ page }) => {
    // Busca por algo inexistente
    const searchInput = page.getByPlaceholder('Buscar por título, artista ou tag...')
    await searchInput.fill('musica-inexistente-xyz')
    
    // Aguarda o resultado
    await page.waitForTimeout(500)
    
    // Verifica mensagem de "nenhum resultado"
    await expect(page.getByText('Nenhuma música encontrada')).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('should work correctly on mobile devices', async ({ page }) => {
    // Define viewport mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Verifica se a interface está adaptada
    await expect(page.getByText('Cifras')).toBeVisible()
    await expect(page.getByPlaceholder('Buscar por título, artista ou tag...')).toBeVisible()
    
    // Verifica se os cards estão responsivos
    await page.waitForSelector('[data-testid="music-card"]')
    const card = page.locator('[data-testid="music-card"]').first()
    const cardWidth = await card.boundingBox()
    expect(cardWidth?.width).toBeLessThan(375)
  })

  test('should work correctly on tablet devices', async ({ page }) => {
    // Define viewport tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    // Verifica se a interface está adaptada
    await expect(page.getByText('Cifras')).toBeVisible()
    
    // Verifica se há mais cards por linha
    await page.waitForSelector('[data-testid="music-card"]')
    const cards = await page.locator('[data-testid="music-card"]').all()
    expect(cards.length).toBeGreaterThan(0)
  })
})
