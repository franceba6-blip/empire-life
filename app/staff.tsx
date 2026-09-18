import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Card, Label, Money, PrimaryButton, SectionTitle } from "@/components/ui";
import { ROLE_LABELS, TRAIT_LABELS } from "@/game/employees/config";
import { hireEmployee } from "@/game/employees/employees";
import { useGameStore } from "@/store/gameStore";
import { colors } from "@/theme";

export default function Staff() {
  const game = useGameStore((state) => state.game), update = useGameStore((state) => state.update);
  if (!game) return null;
  const employees = game.staff.employees;
  const payroll = employees.reduce((sum, employee) => sum + employee.salary, 0);
  const average = (key: "performance" | "morale") => employees.length ? Math.round(employees.reduce((sum, employee) => sum + employee[key], 0) / employees.length) : 0;
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <PrimaryButton title="‹ BUSINESS" tone="dark" onPress={() => router.replace("/(tabs)/business")} />
    <Text style={s.kicker}>BUSINESS · STAFF</Text><Text style={s.title}>Build the team.</Text>
    <Card style={s.summary}><View><Label>Employees</Label><Text style={s.metric}>{employees.length}</Text></View><View><Label>Monthly payroll</Label><Money value={payroll} /></View><View><Label>Avg performance</Label><Text style={s.metric}>{average("performance")}%</Text></View><View><Label>Avg morale</Label><Text style={s.metric}>{average("morale")}%</Text></View></Card>
    <SectionTitle>Your team</SectionTitle>{!employees.length && <Card><Text style={s.copy}>No employees yet. Hire specialists below to delegate real work.</Text></Card>}
    {employees.map((employee) => <Card key={employee.id} style={s.card}><View style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{employee.firstName} {employee.lastName}</Text><Text style={s.role}>{ROLE_LABELS[employee.role]}</Text></View><Money value={employee.salary} /></View><Text style={s.copy}>Performance {employee.performance}% · Morale {employee.morale}% · Skill {employee.skill}</Text><PrimaryButton title="VIEW EMPLOYEE" tone="dark" onPress={() => router.push(`/employee/${employee.id}` as Href)} /></Card>)}
    <SectionTitle>Employee market</SectionTitle>{game.staff.candidates.map((candidate) => <Card key={candidate.id} style={s.card}><Text style={s.name}>{candidate.firstName} {candidate.lastName}</Text><Text style={s.role}>{ROLE_LABELS[candidate.role]} · Age {candidate.age}</Text><Text style={s.copy}>Experience {candidate.experience} years · Skill {candidate.skill} · Reliability {candidate.reliability}</Text><Text style={s.traits}>{candidate.traits.map((trait) => TRAIT_LABELS[trait]).join(" · ")}</Text><Label>Monthly salary expectation</Label><Money value={candidate.salaryExpectation} /><PrimaryButton title="HIRE EMPLOYEE" onPress={() => Alert.alert("Hire employee", `${ROLE_LABELS[candidate.role]}\n€${candidate.salaryExpectation.toLocaleString()} per month\nFirst salary is due in 30 game days.`, [{ text: "Cancel", style: "cancel" }, { text: "Hire", onPress: () => { try { update((state) => hireEmployee(state, candidate.id)); } catch (error) { Alert.alert("Hiring failed", (error as Error).message); } } }])} /></Card>)}
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { padding: 18, paddingTop: 55, paddingBottom: 100, gap: 12 }, kicker: { color: colors.gold, fontWeight: "900", letterSpacing: 1, marginTop: 8 }, title: { color: colors.text, fontSize: 31, fontWeight: "900" }, summary: { flexDirection: "row", flexWrap: "wrap", gap: 18 }, metric: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 5 }, card: { gap: 11 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, name: { color: colors.text, fontSize: 18, fontWeight: "900" }, role: { color: colors.gold, marginTop: 4, fontWeight: "700" }, copy: { color: colors.muted, lineHeight: 20 }, traits: { color: colors.green, fontWeight: "700" } });
