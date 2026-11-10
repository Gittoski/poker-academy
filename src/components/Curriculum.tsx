import React, {useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {lessons,unlocked} from '../curriculum';
import {Progress,completeLesson} from '../progress';
import {ui} from './ui';
export function Curriculum({progress,save,ready}:{progress:Progress;save:(p:Progress)=>void;ready:boolean}) {
 const [open,setOpen]=useState<string|null>(null);const [answer,setAnswer]=useState<number|null>(null);
 return <><Text style={ui.heading}>Your learning path</Text><Text style={ui.muted}>12 lessons · beginner → advanced. Pass each quiz to unlock the next. +20 XP once per lesson.</Text>{lessons.map((l,i)=>{const active=open===l.id;const allowed=ready&&unlocked(i,progress.completed??[]);return <View style={ui.card} key={l.id}>
 <Pressable accessibilityRole="button" accessibilityState={{expanded:active,disabled:!allowed}} disabled={!allowed} onPress={()=>{setOpen(active?null:l.id);setAnswer(null);}}><Text style={ui.label}>{l.stage} · {progress.completed?.includes(l.id)?'✓ Completed':allowed?'Available':'Locked'}</Text><Text style={ui.heading}>{i+1}. {l.title}</Text></Pressable>
 {active&&<><Text style={ui.text}>{l.body}</Text><Text style={ui.muted}>{l.basis}</Text><Text style={ui.heading}>{l.question}</Text>{l.choices.map((c,n)=><Pressable accessibilityRole="button" disabled={answer!==null} key={c} style={ui.button} onPress={()=>{setAnswer(n);if(n===l.answer)save(completeLesson(progress,l.id));}}><Text style={ui.text}>{c}</Text></Pressable>)}{answer!==null&&<><Text accessibilityRole="alert" style={ui.text}>{answer===l.answer?'Correct. Lesson complete.':'Review and try again.'} {l.explanation}</Text>{answer!==l.answer&&<Pressable accessibilityRole="button" style={ui.button} onPress={()=>setAnswer(null)}><Text style={ui.text}>Retry quiz</Text></Pressable>}</>}</>}
 </View>})}</>;
}
