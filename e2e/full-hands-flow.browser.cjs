const {test,expect}=require('@playwright/test')
const {reviewLatest,readyRaise}=require('./support/live.cjs')
const key='poker-academy:live:v1'
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
async function seed(page,extra={}){
 await page.addInitScript(({key,extra})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:3,current:{mode:'full-hands',seed:42,hero:4,style:'balanced',config:{stacks:Array(6).fill(10000),button:3,smallBlind:50,bigBlind:100},actions:[...Array(5).fill({kind:'call'}),{kind:'check'}],feedback:[],...extra},archive:[]}))
 },{key,extra})
 await page.clock.install()
}
test('an ungraded postflop choice continues automatically and remains inspectable through explicit review',async({page})=>{
 await seed(page);await page.goto('/live')
 await page.getByRole('button',{name:'Check',exact:true}).click()
 const answered=(await read(page)).current
 expect(answered.feedback.at(-1).reference.status).toBe('ungraded')
 expect(answered.acknowledgedAction).toBe(6)
 await expect(page.getByRole('region',{name:'Decision feedback',exact:true})).toHaveCount(0)
 await expect(page.getByRole('dialog',{name:'Review this decision',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Continue hand',exact:true})).toHaveCount(0)
 await page.clock.runFor(900)
 await expect.poll(async()=>(await read(page)).current.actions.length).toBeGreaterThan(7)
 const progressed=(await read(page)).current
 await reviewLatest(page)
 await page.getByRole('button',{name:'Check',exact:true}).click()
 await expect(page.locator('.live-decision')).toContainText('No matching range')
 expect((await read(page)).current).toEqual(progressed)
})
test('older ungraded checkpoints do not reopen the empty feedback prompt on reload',async({page})=>{
 const reference={status:'ungraded',reason:'postflop',explanation:'No verified live postflop reference is available for this board and betting history.',source:'Test fixture; no strategy grade.'}
 await seed(page,{actions:[...Array(5).fill({kind:'call'}),{kind:'check'},{kind:'check'}],feedback:[{index:6,reference}]})
 await page.goto('/live')
 await expect(page.getByRole('button',{name:'Continue hand',exact:true})).toBeVisible()
 await expect(page.getByRole('region',{name:'Decision feedback',exact:true})).toHaveCount(0)
 const before=await read(page);expect(before.current.feedback[0].reference).toEqual(reference)
 await page.getByRole('button',{name:'Continue hand',exact:true}).click()
 await page.clock.runFor(900)
 await expect.poll(async()=>(await read(page)).current.actions.length).toBeGreaterThan(7)
 expect((await read(page)).current.feedback[0].reference).toEqual(reference)
})
test('an ungraded fold stops immediately without a feedback acknowledgment or later actions',async({page})=>{
 await seed(page,{hero:5,actions:Array(5).fill({kind:'call'})});await page.goto('/live')
 await page.getByRole('button',{name:'Fold',exact:true}).click()
 await expect(page.getByRole('heading',{name:'You folded',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Deal next live hand',exact:true})).toBeVisible()
 await expect(page.locator('.live-decision')).toHaveCount(0)
 const before=(await read(page)).current
 await page.clock.runFor(20000);expect((await read(page)).current).toEqual(before)
 await expect(page.locator('.table-board .playing-card')).toHaveCount(0)
})
test('a graded mistake still pauses and shows its chart before play resumes',async({page})=>{
 await seed(page,{hero:0,actions:[]});await page.goto('/live');await readyRaise(page)
 await page.getByRole('button',{name:/^Call /}).click()
 await expect(page.getByRole('dialog',{name:'Review this decision',exact:true})).toContainText('Outside range')
 const before=(await read(page)).current
 await page.clock.runFor(5000);expect((await read(page)).current).toEqual(before)
 await page.getByRole('button',{name:'Continue hand',exact:true}).click()
 await page.clock.runFor(900)
 await expect.poll(async()=>(await read(page)).current.actions.length).toBeGreaterThan(1)
})
test('an ungraded all-in call reaches the actual showdown result without an empty decision dialog',async({page})=>{
 await seed(page,{hero:5,actions:[{kind:'raise',to:10000},...Array(4).fill({kind:'call'})]});await page.goto('/live')
 await page.getByRole('button',{name:/^Call /}).click()
 await expect(page.getByRole('dialog',{name:'Showdown result',exact:true})).toBeVisible()
 await expect(page.getByRole('dialog',{name:'Review this decision',exact:true})).toHaveCount(0)
 await expect(page.locator('.table-board .playing-card')).toHaveCount(5)
 expect((await read(page)).current.feedback.at(-1).reference.status).toBe('ungraded')
})
