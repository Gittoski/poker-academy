const {test,expect}=require('@playwright/test')
const fs=require('node:fs')
const {readyRaise,feedback,tools}=require('./support/live.cjs')
const key='poker-academy:live:v1'
const charts=JSON.parse(fs.readFileSync('public/ranges/Cash_100_PTO.json','utf8'))
async function seed(page,extra={}) {
 await page.addInitScript(({key,extra})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:3,current:{seed:42,hero:0,style:'balanced',actions:[],feedback:[],config:{stacks:Array(6).fill(10000),button:3,smallBlind:50,bigBlind:100},...extra},archive:[]}))
 },{key,extra})
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)

test('chart recovery is reachable before opponents act, not only on the learner turn',async({page})=>{
 await seed(page,{hero:3});let available=false
 await page.route('**/ranges/Cash_100_PTO.json',r=>available?r.fulfill({json:charts}):r.fulfill({status:503,body:'Unavailable'}))
 await page.clock.install();await page.goto('/live')
 const panel=page.getByRole('region',{name:'Grading charts',exact:true})
 await expect(panel).toContainText('Grading charts could not load')
 await page.clock.runFor(5000)
 expect((await saved(page)).current.actions).toEqual([])
 available=true;await panel.getByRole('button',{name:'Retry charts',exact:true}).click()
 await expect(panel).toHaveCount(0)
 await page.getByRole('button',{name:'Continue hand',exact:true}).click()
 await page.clock.runFor(900)
 expect((await saved(page)).current.actions.length).toBeGreaterThan(0)
})

test('waiting for actual charts prevents an early click from losing its grade',async({page})=>{
 await seed(page)
 let release;const gate=new Promise(resolve=>{release=resolve})
 await page.route('**/ranges/Cash_100_PTO.json',async r=>{await gate;await r.fulfill({json:charts})})
 await page.goto('/live')
 await expect(page.getByRole('region',{name:'Grading charts',exact:true})).toContainText('Loading grading charts')
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toHaveCount(0)
 expect((await saved(page)).current.actions).toEqual([])
 release();await readyRaise(page)
 await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
 const r=(await saved(page)).current.feedback.at(-1).reference
 expect(r.status).not.toBe('ungraded');expect(r.chart).toBeDefined()
 await feedback(page);await expect(page.getByRole('region',{name:'Range chart',exact:true}).getByRole('gridcell')).toHaveCount(169)
})

for(const failure of ['http','empty'])test(`${failure}: failed charts can retry without losing the hand`,async({page})=>{
 await seed(page);let attempts=0
 await page.route('**/ranges/Cash_100_PTO.json',r=>++attempts===1?r.fulfill(failure==='http'?{status:503,body:'Unavailable'}:{json:[]}):r.fulfill({json:charts}))
 await page.goto('/live')
 const panel=page.getByRole('region',{name:'Grading charts',exact:true})
 await expect(panel).toContainText('Grading charts could not load')
 const before=await saved(page);const cards=await page.getByRole('img',{name:/^Your hand:/}).getAttribute('aria-label')
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toHaveCount(0)
 await panel.getByRole('button',{name:'Retry charts',exact:true}).click()
 await readyRaise(page);expect(attempts).toBe(2)
 expect(await saved(page)).toEqual(before)
 await expect(page.getByRole('img',{name:/^Your hand:/})).toHaveAttribute('aria-label',cards)
 await page.getByRole('button',{name:'Fold',exact:true}).click()
 expect((await saved(page)).current.feedback.at(-1).reference.status).not.toBe('ungraded')
})

test('playing without charts is explicit; saved ungraded decisions never become invented grades',async({page})=>{
 await seed(page);let available=false
 await page.route('**/ranges/Cash_100_PTO.json',r=>available?r.fulfill({json:charts}):r.fulfill({status:503,body:'Unavailable'}))
 await page.goto('/live');await page.getByRole('button',{name:'Play ungraded',exact:true}).click()
 await page.getByRole('button',{name:'Fold',exact:true}).click()
 await expect(page.locator('.live-decision')).toHaveCount(0)
 const original=(await saved(page)).current
 await require('./support/live.cjs').reviewLatest(page)
 await page.getByRole('button',{name:'Fold',exact:true}).click()
 await feedback(page,'Explanation')
 await expect(page.getByRole('dialog',{name:'Review this decision',exact:true})).toContainText('cannot label this decision correct or incorrect')
 await page.getByRole('button',{name:'Return to live hand',exact:true}).click()
 await tools(page);await page.getByText('Save and source details',{exact:true}).click()
 available=true;await page.getByRole('button',{name:'Retry charts',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Practice tools',exact:true}).getByRole('status')).toContainText('Grading charts: loaded.')
 expect((await saved(page)).current).toEqual(original)
 await page.getByRole('button',{name:'Back to hand',exact:true}).click()
 await page.getByRole('button',{name:'Deal next live hand',exact:true}).click()
 await readyRaise(page);await page.getByRole('button',{name:'Fold',exact:true}).click()
 expect((await saved(page)).current.feedback.at(-1).reference.status).not.toBe('ungraded')
 expect((await saved(page)).archive.at(-1).feedback.at(-1).reference.status).toBe('ungraded')
})

test('random postflop choices continue without false grades; missing reference details stay available in manual review',async({page},info)=>{
 await seed(page,{hero:4,actions:[...Array(5).fill({kind:'call'}),{kind:'check'}]})
 await page.clock.install();await page.goto('/live');await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 await expect(page.locator('.range-card__title')).toContainText('Postflop ungraded')
 await page.getByRole('button',{name:'Check',exact:true}).click()
 await expect(page.locator('.live-decision')).toHaveCount(0)
 expect((await saved(page)).current.feedback.at(-1).reference.status).toBe('ungraded')
 await expect(page.getByRole('button',{name:'Continue hand',exact:true})).toHaveCount(0)
 for(const [width,height] of [[320,568],[390,844],[844,390]]) {
  await page.setViewportSize({width,height})
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true)
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('postflop-uninterrupted.png')})
 await page.clock.runFor(900)
 await expect.poll(async()=>(await saved(page)).current.actions.length).toBeGreaterThan(7)
 const actual=(await saved(page)).current
 await require('./support/live.cjs').reviewLatest(page)
 await page.getByRole('button',{name:'Check',exact:true}).click()
 await feedback(page,'Explanation')
 await expect(page.getByRole('dialog',{name:'Review this decision',exact:true})).toContainText('cannot label this decision correct or incorrect')
 await feedback(page,'Chart');await expect(page.getByRole('region',{name:'Range chart',exact:true}).getByRole('grid')).toHaveCount(0)
 expect((await saved(page)).current).toEqual(actual)
})
