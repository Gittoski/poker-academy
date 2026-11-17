const {test,expect}=require('@playwright/test')
const AxeBuilder=require('@axe-core/playwright').default
const {readyRaise,feedback,closeFeedback,setRaise}=require('./support/live.cjs')
const key='poker-academy:live:v1'
const ranks='AKQJT98765432'
const all=[...ranks].flatMap((a,i)=>[...ranks].map((b,j)=>i===j?a+b:i<j?a+b+'s':b+a+'o')).join(',')
const chart=[{id:'open',scenario:'open',hero:['LJ'],rangeTypes:['pto'],formats:['cash'],range:{raise:all}}]
async function seed(page,{hero=0,actions=[],mode='full-hands'}={}) { await page.addInitScript(({key,hero,actions,mode})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:2,current:{seed:42,hero,actions,mode,style:'balanced',config:{stacks:Array(6).fill(10000),button:3,smallBlind:50,bigBlind:100},feedback:[]},archive:[]}))},{key,hero,actions,mode}) }
const saved=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
test('supported answers stay compact; errors auto-open explanation and retry restores the actual spot',async({page},info)=>{
 await seed(page);await page.route('**/ranges/Cash_100_PTO.json',r=>r.fulfill({json:chart}));await page.goto('/live');await readyRaise(page)
 await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
 await expect(page.locator('.live-decision')).toContainText('In range')
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.locator('.live-decision')).toHaveClass(/verdict--correct/)
 await feedback(page,'Explanation')
 await page.getByRole('button',{name:'Retry',exact:true}).click()
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Fold',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Review this decision',exact:true});await expect(dialog).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Explanation',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(dialog).toContainText('Your original mistake stays saved')
 await expect(dialog.locator('.verdict--wrong')).toBeVisible()
 const footer=dialog.locator('.sim-sheet__actions');await dialog.locator('.sim-sheet__scroll').evaluate(el=>el.scrollTop=el.scrollHeight)
 expect(await footer.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight)).toBe(true)
 await dialog.getByRole('button',{name:'Close explanation',exact:true}).click()
 await page.getByRole('button',{name:'Practice tools',exact:true}).click()
 await page.getByRole('dialog',{name:'Practice tools',exact:true}).getByRole('button',{name:'Back to hand',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.locator('.live-decision').getByRole('button',{name:'Explanation & chart',exact:true}).click()
 await dialog.getByRole('button',{name:'Retry',exact:true}).click()
 const before=await saved(page);expect(before.current.actions).toEqual([])
 expect(before.archive.flatMap(d=>d.feedback??[]).filter(f=>f.reference.status==='outside')).toHaveLength(1)
 await readyRaise(page);await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
 await expect(page.locator('.live-decision')).toContainText('In range')
 expect((await saved(page)).current.actions).toEqual([{kind:'raise',to:250}])
 await page.screenshot({path:info.outputPath('compact-success.png')})
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])
})
for(const mode of ['full-hands','preflop'])test(`${mode}: fold ends immediately without any later opponent actions or future cards`,async({page})=>{
 await seed(page,{hero:5,mode,actions:Array(5).fill({kind:'call'})});await page.clock.install();await page.goto('/live');await page.getByRole('button',{name:'Fold',exact:true}).click()
 await expect(page.locator('.live-decision')).toContainText('No matching range');await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'You folded',exact:true})).toBeVisible()
 const before=await saved(page);await page.clock.runFor(20000);expect(await saved(page)).toEqual(before)
 await expect(page.locator('.table-board .playing-card')).toHaveCount(0);await expect(page.locator('.live-showdown')).toHaveCount(0)
 await page.reload();await expect(page.getByRole('heading',{name:'You folded',exact:true})).toBeVisible();expect((await saved(page)).current.actions).toHaveLength(6)
 await page.getByRole('button',{name:mode==='preflop'?'Deal next preflop hand':'Deal next live hand',exact:true}).click()
 expect((await saved(page)).archive.at(-1).actions).toHaveLength(6)
})
test('approved layout keeps table, cards and three action buttons separated at phone and landscape sizes',async({page},info)=>{
 await seed(page);await page.goto('/live');await readyRaise(page)
 for(const [width,height] of [[320,568],[375,667],[390,664],[390,844],[430,932],[768,1024],[844,390]]) {
  await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const table=await page.locator('.live-hand > .navy-table').boundingBox();const actions=await page.getByRole('group',{name:'Your move',exact:true}).boundingBox()
  if(width<500)expect(table.y+table.height).toBeLessThanOrEqual(actions.y+1)
  for(const button of await page.getByRole('group',{name:'Your move',exact:true}).getByRole('button').all()){const b=await button.boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(height);expect(b.x+b.width).toBeLessThanOrEqual(width)}
  if(width===390&&height===844)await page.screenshot({path:info.outputPath('restored-phone.png')})
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Bet sizing',exact:true}).click();await page.getByLabel('Raise to (BB)',{exact:true}).fill('1.999');await page.getByRole('button',{name:'Apply size',exact:true}).click();await expect(page.getByRole('dialog',{name:'Bet sizing',exact:true}).getByRole('alert')).toBeVisible();await page.getByRole('dialog',{name:'Bet sizing',exact:true}).getByRole('button',{name:'Back to hand',exact:true}).click();await expect(page.getByRole('button',{name:'Raise / bet',exact:true})).toContainText('2.5');await setRaise(page,'2.51');await page.getByRole('button',{name:'Raise / bet',exact:true}).click();expect((await saved(page)).current.actions[0]).toEqual({kind:'raise',to:251})
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.live-decision')).toContainText('No matching range')
})

test('exports the current learning format with the original folded action intact',async({page})=>{
 await page.goto('/live');await readyRaise(page);const original=(await saved(page)).current
 await page.getByRole('button',{name:'Fold',exact:true}).click();await closeFeedback(page)
 await page.getByRole('button',{name:'Practice tools',exact:true}).click()
 await page.getByText('Save and source details',{exact:true}).click()
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export live practice',exact:true}).click()
 const download=await event;const payload=JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'))
 expect(payload.version).toBe(3);expect(payload.current.actions).toEqual([{kind:'fold'}])
 expect(payload.current.seed).toBe(original.seed)
})
