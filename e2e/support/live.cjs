const { expect } = require('@playwright/test')
async function readyRaise(page, amount = '2.5') { await expect(page.getByRole('button', { name:'Raise / bet',exact:true })).toContainText(amount) }
async function setRaise(page, amount) {
  await page.getByRole('button', { name:'Bet sizing',exact:true }).click()
  await page.getByLabel('Raise to (BB)', { exact:true }).fill(amount)
  await page.getByRole('button', { name:'Apply size',exact:true }).click()
}
async function feedback(page, tab = 'Chart') {
  const dialog=page.getByRole('dialog', { name:'Review this decision',exact:true })
  if (!await dialog.isVisible()) await page.locator('.live-decision').getByRole('button',{name:'Explanation & chart',exact:true}).click()
  await dialog.getByRole('button',{name:tab,exact:true}).click()
  return dialog.getByRole('region',{name:'Decision feedback',exact:true})
}
async function closeFeedback(page) {
  const dialog=page.getByRole('dialog',{name:'Review this decision',exact:true})
  if(await dialog.isVisible()) await dialog.getByRole('button',{name:'Close explanation',exact:true}).click()
}
async function tools(page) { await closeFeedback(page); await page.getByRole('button',{name:'Practice tools',exact:true}).click() }
async function reviewLatest(page) {
 await tools(page)
 const summary=page.locator('summary').filter({hasText:/Review recent decisions/})
 if(!await summary.evaluate(e=>e.parentElement.open))await summary.click()
 await page.getByRole('button',{name:'Retry decision',exact:true}).first().click()
}
module.exports={readyRaise,setRaise,feedback,closeFeedback,tools,reviewLatest}
