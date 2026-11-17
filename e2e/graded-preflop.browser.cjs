const {test,expect}=require('@playwright/test')
const AxeBuilder=require('@axe-core/playwright').default
const fs=require('node:fs')
const {feedback,tools,closeFeedback}=require('./support/live.cjs')
const key='poker-academy:live:v1'
const charts=JSON.parse(fs.readFileSync('public/ranges/Cash_100_PTO.json','utf8'))
const base={mode:'preflop',seed:42,hero:0,style:'balanced',config:{stacks:Array(6).fill(10000),button:3,smallBlind:50,bigBlind:100},actions:[],feedback:[],graded:{version:1,context:'open:LJ'}}
const saved=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
async function seed(page,deal=base,extra={}) {
 await page.addInitScript(({key,deal,extra})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:deal.graded?4:3,current:deal,archive:[],...extra}))
 },{key,deal,extra})
}
test('wrong call is graded with a full chart; retry retains it once and a supported answer stays compact',async({page},info)=>{
 await seed(page);await page.goto('/live');await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Bet sizing',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:/^Call /}).click()
 const dialog=page.getByRole('dialog',{name:'Review this decision',exact:true})
 await expect(dialog).toContainText('Outside range');await expect(dialog).toContainText('Reference boundary')
 const first=await saved(page);expect(first.current.actions).toEqual([{kind:'call'}]);expect(first.current.feedback[0].reference.status).toBe('outside')
 await feedback(page);await expect(page.getByRole('region',{name:'Range chart',exact:true}).getByRole('gridcell')).toHaveCount(169)
 await page.screenshot({path:info.outputPath('preflop-error-chart.png')})
 await dialog.getByRole('button',{name:'Retry',exact:true}).click()
 expect((await saved(page)).current.actions).toEqual([])
 expect((await saved(page)).current.seed).toBe(first.current.seed)
 expect((await saved(page)).archive.flatMap(d=>d.feedback??[])).toHaveLength(1)
 if(first.current.feedback[0].reference.frequencies.raise>0)await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
 else await page.getByRole('button',{name:'Fold',exact:true}).click()
 await expect(page.locator('.live-decision')).toContainText('In range')
 await expect(page.getByRole('dialog')).toHaveCount(0)
 const answer=await saved(page);expect(answer.version).toBe(4);expect(answer.current.feedback[0].reference.status).toBe('match')
 await page.reload();await expect(page.locator('.live-decision')).toContainText('In range');expect((await saved(page)).current).toEqual(answer.current)
})
test('explicit upgrade preserves an old custom hand and the parked Full hands game',async({page})=>{
 const old={...base,graded:undefined,hero:8,config:{stacks:Array(9).fill(5000),button:6,smallBlind:50,bigBlind:100}}
 const full={...base,graded:undefined,mode:'full-hands',hero:2,seed:100}
 await seed(page,old,{parked:{'full-hands':full}});await page.goto('/live');await tools(page)
 await page.getByRole('button',{name:'Start graded practice',exact:true}).click()
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 const upgraded=await saved(page);expect(upgraded.version).toBe(4);expect(upgraded.archive.at(-1)).toEqual(JSON.parse(JSON.stringify(old)));expect(upgraded.parked['full-hands']).toEqual(JSON.parse(JSON.stringify(full)))
 expect(upgraded.current.graded).toBeDefined();expect(upgraded.current.config.stacks).toEqual(Array(6).fill(10000))
 await page.locator('.live-header').getByRole('switch',{name:'Preflop mode'}).click()
 await expect.poll(async()=>(await saved(page)).current).toEqual(JSON.parse(JSON.stringify(full)))
 await page.locator('.live-header').getByRole('switch',{name:'Preflop mode'}).click()
 await expect.poll(async()=>(await saved(page)).current).toEqual(upgraded.current)
 await tools(page);await page.getByText('Live table settings',{exact:true}).click()
 await expect(page.getByRole('combobox',{name:'Players',exact:true})).toBeDisabled()
 await expect(page.getByRole('combobox',{name:'Opponent policy',exact:true})).toBeDisabled()
 await expect(page.getByRole('combobox',{name:'Opponent policy',exact:true})).toContainText('Imported reference charts')
 await expect(page.getByLabel('Starting stacks (BB, seat order)',{exact:true})).toBeDisabled()
 await page.getByRole('combobox',{name:'Your position',exact:true}).selectOption('5')
 await page.getByRole('button',{name:'Start with these settings',exact:true}).click()
 expect((await saved(page)).current.hero).toBe(5);expect((await saved(page)).current.graded.seat).toBe(5)
})
test('facing a 5bet gives a real graded all-in call and stops before postflop cards',async({page})=>{
 const actions=[{kind:'raise',to:250},...Array(4).fill({kind:'fold'}),{kind:'raise',to:1250},{kind:'raise',to:2500},{kind:'raise',to:10000}]
 await seed(page,{...base,graded:{version:1,context:'vs-5bet:LJ:BB'},actions});await page.goto('/live')
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Raise / bet',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:/^Call /}).click()
 expect((await saved(page)).current.feedback.at(-1).reference.status).not.toBe('ungraded')
 await expect(page.getByRole('heading',{name:'Preflop complete',exact:true})).toBeVisible()
 await expect(page.locator('.table-board .playing-card')).toHaveCount(0)
 await closeFeedback(page);await page.getByRole('button',{name:'Deal next preflop hand',exact:true}).click()
 expect((await saved(page)).current.graded).toBeDefined()
})
test('missing or partial charts pause covered practice and recover without losing the decision',async({page})=>{
 await seed(page);let stage=0
 await page.route('**/ranges/Cash_100_PTO.json',r=>stage===0?r.fulfill({status:503,body:'Unavailable'}):r.fulfill({json:stage===1?[charts[0]]:charts}))
 await page.goto('/live');await expect(page.getByRole('region',{name:'Grading charts',exact:true})).toContainText('could not load')
 await expect(page.getByRole('button',{name:'Play ungraded',exact:true})).toHaveCount(0)
 const before=(await saved(page)).current
 stage=1;await page.getByRole('button',{name:'Retry charts',exact:true}).click()
 await expect(page.getByRole('region',{name:'Preflop reference problem',exact:true})).toBeVisible()
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toHaveCount(0)
 stage=2;await page.getByRole('button',{name:'Reload charts',exact:true}).click()
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 expect((await saved(page)).current).toEqual(before)
})
test('fresh preflop link uses graded practice with accessible no-scroll layouts',async({page},info)=>{
 await page.goto('/live?mode=preflop');await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 expect((await saved(page)).current.graded).toBeDefined()
 for(const [width,height]of [[320,568],[390,844],[768,1024],[844,390],[1365,950]]){
  await page.setViewportSize({width,height})
  if(width<1024)expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true)
  const moves=page.getByRole('group',{name:'Your move',exact:true})
  for(const button of await moves.getByRole('button').all()){
   const b=await button.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width+1);expect(b.y+b.height).toBeLessThanOrEqual(height+1)
  }
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('graded-preflop-phone.png')})
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])
})
test('a fresh preflop setup recovers from an incomplete catalog without leaving a stale error',async({page})=>{
 let complete=false
 await page.route('**/ranges/Cash_100_PTO.json',r=>r.fulfill({json:complete?charts:[charts[0]]}))
 await page.goto('/live?mode=preflop')
 await expect(page.getByRole('region',{name:'Preflop reference problem',exact:true})).toBeVisible()
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toHaveCount(0)
 complete=true;await page.getByRole('button',{name:'Reload charts',exact:true}).click()
 await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 await expect(page.locator('.live-page').getByRole('alert')).toHaveCount(0)
 expect((await saved(page)).current.graded).toBeDefined()
})
test('saved-decision retry does not inherit the live hand reference-boundary message',async({page})=>{
 await seed(page);await page.goto('/live');await page.getByRole('button',{name:/^Call /}).click()
 const before=await saved(page), reference=before.current.feedback.at(-1).reference
 await tools(page);await page.getByText('Review recent decisions (1)',{exact:true}).click()
 await page.getByRole('button',{name:'Retry decision',exact:true}).click()
 if(reference.frequencies.raise>0)await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
 else await page.getByRole('button',{name:'Fold',exact:true}).click()
 await expect(page.locator('.live-decision')).toContainText('In range')
 await expect(page.getByRole('dialog')).toHaveCount(0)
 expect((await saved(page)).current).toEqual(before.current)
})
