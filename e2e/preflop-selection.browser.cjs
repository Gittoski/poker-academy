const {test,expect}=require('@playwright/test')
const {closeFeedback,tools,watchSetup}=require('./support/live.cjs')
const key='poker-academy:live:v1'
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
test('actual Next hand controls deliver a varied balanced study mix without regrading the saved hand',async({page},info)=>{
 await page.addInitScript(key=>{
  let randomState=987654321
  Object.defineProperty(crypto,'getRandomValues',{value:array=>{
   for(let i=0;i<array.length;i++){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;array[i]=randomState}
   return array
  }})
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:4,current:{mode:'preflop',seed:42,hero:0,style:'balanced',graded:{version:1,context:'open:LJ'},config:{stacks:Array(6).fill(10000),button:3,smallBlind:50,bigBlind:100},actions:[],feedback:[]},archive:[]}))
 },key)
 await page.clock.install()
 await page.goto('/live');await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 const original=(await read(page)).current
 await page.reload();await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
 expect((await read(page)).current).toEqual(original)
 await page.getByRole('button',{name:'Fold',exact:true}).click()
 let active=0,common=0;const contexts=[],hands=new Set(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 for(let n=0;n<40;n++){
  await page.getByRole('button',{name:'Deal next preflop hand',exact:true}).click()
  await watchSetup(page)
  await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
  const before=(await read(page)).current
  expect(Object.keys(before.graded).sort()).toEqual(['context','version'])
  if(contexts.length)expect(before.graded.context).not.toBe(contexts.at(-1))
  contexts.push(before.graded.context)
  if(before.graded.context.startsWith('open:')||before.graded.context.startsWith('vs-raise:'))common++
  await page.getByRole('button',{name:'Fold',exact:true}).click()
  const after=(await read(page)).current,ref=after.feedback.at(-1).reference
  expect(ref.status).not.toBe('ungraded')
  expect(after.seed).toBe(before.seed)
  if(ref.frequencies.raise>0||ref.frequencies.call>0){active++;expect(ref.status).toBe('outside')}
  else expect(ref.status).toBe('match')
  hands.add(ref.chart.hand)
 }
 expect(active).toBeGreaterThanOrEqual(14);expect(active).toBeLessThanOrEqual(34)
 expect(common).toBeGreaterThanOrEqual(24);expect(hands.size).toBeGreaterThan(15)
 expect(errors).toEqual([])
 require('node:fs').writeFileSync(info.outputPath('selection-playthrough.json'),JSON.stringify({newHands:40,continuing:active,foldOnly:40-active,common,contexts:new Set(contexts).size,handClasses:hands.size,errors},null,2))
 await closeFeedback(page);await tools(page)
 await expect(page.getByRole('dialog',{name:'Practice tools',exact:true})).toContainText('Balanced study mix: about 60%')
 await expect(page.getByRole('dialog',{name:'Practice tools',exact:true})).toContainText('not normal live-game frequencies')
})
