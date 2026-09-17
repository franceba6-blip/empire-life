import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton } from '@/components/ui';
import { JOBS } from '@/config/balance';
import { useGameStore } from '@/store/gameStore';
import { colors, spacing } from '@/theme';

const timeLabel = (hours: number) => hours === 24 ? '1 day' : `${hours} hours`;
export default function Earn() {
  const work = useGameStore(state => state.work);
  const accept = (job: typeof JOBS[number]) => Alert.alert(job.name, `REWARD\n€${job.minReward}–€${job.maxReward}\n\nTIME REQUIRED\n${timeLabel(job.timeHours)}\n\nThis will advance game time by ${timeLabel(job.timeHours)}.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Accept Job', onPress: () => { const result = work(job.id); Alert.alert('Job complete', `You earned €${result.reward}.\n${timeLabel(result.hours)} of in-game time passed.`); } }
  ]);
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text onPress={() => router.back()} style={s.back}>‹ Back</Text><Text style={s.title}>Earn Money</Text><Text style={s.subtitle}>Work earns cash, but time is your most limited resource.</Text>
    {JOBS.map(job => <Card key={job.id} style={s.job}><View style={s.row}><View style={s.icon}><Ionicons name={job.icon} size={24} color={colors.gold} /></View><View style={s.info}><Text style={s.name}>{job.name}</Text><Text style={s.meta}>Reward · €{job.minReward}–€{job.maxReward}</Text><Text style={s.time}>Time required · {timeLabel(job.timeHours)}</Text><Text style={s.risk}>Risk · {job.risk}</Text></View></View><PrimaryButton title="REVIEW JOB" onPress={() => accept(job)} /></Card>)}
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},content:{padding:spacing.md,paddingTop:55,paddingBottom:80,gap:12},back:{color:colors.gold,fontWeight:'800',fontSize:17},title:{color:colors.text,fontSize:34,fontWeight:'900',marginTop:10},subtitle:{color:colors.muted,marginBottom:10,lineHeight:20},job:{gap:16},row:{flexDirection:'row',alignItems:'center'},icon:{width:48,height:48,borderRadius:16,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},info:{marginLeft:14,flex:1},name:{color:colors.text,fontSize:17,fontWeight:'800'},meta:{color:colors.text,marginTop:5,fontWeight:'700'},time:{color:colors.gold,marginTop:4,fontWeight:'800'},risk:{color:colors.muted,marginTop:4,fontSize:12}});
