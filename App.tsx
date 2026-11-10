import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeProgress, freshProgress, level, Progress } from './src/progress';
const KEY = 'poker-academy.progress.v1';
const curriculum = ['01 · Foundations — rules, positions & hand strength', '02 · Mathematics — odds, equity & expected value', '03 · Preflop — disciplined six-max decisions', '04 · Postflop — texture, value & pressure', '05 · Exploits — adapt to observed mistakes', '06 · Table lab — practice with virtual chips'];
export default function App() {
  const [tab, setTab] = useState('Learn');
  const [progress, setProgress] = useState<Progress>(freshProgress);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { setProgress(decodeProgress(raw)); setReady(true); }).catch(() => setError('Progress could not be read. Stored data has been preserved. Restart to retry.')); }, []);
  return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="light"/><ScrollView contentContainerStyle={s.body}>
    <Text style={s.eyebrow}>POKER ACADEMY  /  6-MAX NLHE</Text><Text style={s.title}>Better decisions.{'\n'}One hand at a time.</Text>
    <Text style={s.sub}>Train with intention. Play with confidence.</Text>
    <View style={s.hero}><Text style={s.eyebrow}>YOUR JOURNEY</Text><Text style={s.heading}>Level {level(progress.xp)} · {progress.xp} XP</Text><Text style={s.sub}>{ready ? 'Progress stays on this device. No account required.' : 'Loading local progress…'}</Text></View>
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    <View style={s.tabs}>{['Learn', 'Practice', 'Progress'].map(t => <Pressable accessibilityRole="button" accessibilityState={{ selected: tab === t }} key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.active]}><Text style={s.text}>{t}</Text></Pressable>)}</View>
    {tab === 'Learn' ? <><Text style={s.heading}>Your learning path</Text>{curriculum.map((c, i) => <View key={c} style={s.card}><Text style={s.text}>{c}</Text><Text style={s.sub}>{i === 0 ? 'Start with strong fundamentals.' : 'Build on the concepts before it.'} · Content planned</Text></View>)}</> : tab === 'Practice' ? <View style={s.card}><Text style={s.heading}>Practice lab</Text><Text style={s.sub}>Mathematics drills arrive in milestone 2. Decision trainers and the simulator follow tested poker foundations.</Text></View> : <View style={s.card}><Text style={s.heading}>Session history</Text><Text style={s.sub}>No attempts yet. Your accuracy and topics to revisit will appear here.</Text></View>}
    <Text style={s.foot}>Simplified strategies will be labeled educational heuristics, with explicit assumptions. No solver outputs are claimed.</Text>
  </ScrollView></SafeAreaView></SafeAreaProvider>;
}
const s = StyleSheet.create({root:{flex:1,backgroundColor:'#0A1015'},body:{padding:24,paddingBottom:48,maxWidth:680,width:'100%',alignSelf:'center',gap:18},eyebrow:{color:'#57D9B0',fontSize:12,letterSpacing:1.7,fontWeight:'700'},title:{color:'#F2F5F7',fontSize:36,fontWeight:'800',lineHeight:43},sub:{color:'#AEBCC6',fontSize:15,lineHeight:23},hero:{padding:24,backgroundColor:'#12312D',borderRadius:20,gap:12},heading:{color:'#F2F5F7',fontSize:21,fontWeight:'700'},tabs:{flexDirection:'row',gap:8},tab:{flex:1,paddingVertical:15,alignItems:'center',borderRadius:12,backgroundColor:'#17232D'},active:{backgroundColor:'#22604F'},text:{color:'#F2F5F7',fontSize:16,lineHeight:24},card:{backgroundColor:'#131F29',padding:20,borderRadius:16,gap:10},foot:{color:'#AEBCC6',fontSize:12,lineHeight:19},error:{color:'#FFB6B6'}});
