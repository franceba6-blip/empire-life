import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Card, Label, Money, PrimaryButton, SectionTitle } from "@/components/ui";
import { ROLE_LABELS, TRAIT_LABELS, TRAINING } from "@/game/employees/config";
import { fireEmployee, promoteEmployee, raiseSalary, trainEmployee } from "@/game/employees/employees";
import { formatGameDate } from "@/game/time/time";
import { useGameStore } from "@/store/gameStore";
import { colors } from "@/theme";

export default function EmployeeProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGameStore((state) => state.game), update = useGameStore((state) => state.update);
  if (!game) return null;
  const employee = game.staff.employees.find((item) => item.id === id);
  if (!employee) return <View style={s.root}><Text style={s.title}>Employee not found</Text><PrimaryButton title="BACK TO STAFF" onPress={() => router.replace("/staff" as Href)} /></View>;
  const action = (title: string, detail: string, fn: () => void, destructive = false) => Alert.alert(title, detail, [{ text: "Cancel", style: "cancel" }, { text: "Confirm", style: destructive ? "destructive" : "default", onPress: () => { try { fn(); } catch (error) { Alert.alert("Action failed", (error as Error).message); } } }]);
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <PrimaryButton title="‹ STAFF" tone="dark" onPress={() => router.replace("/staff" as Href)} />
    <Text style={s.kicker}>EMPLOYEE PROFILE</Text><Text style={s.title}>{employee.firstName} {employee.lastName}</Text><Text style={s.role}>{ROLE_LABELS[employee.role]}</Text>
    <Card style={s.grid}>{[["Skill", employee.skill], ["Experience", `${employee.experience.toFixed(1)} years`], ["Efficiency", employee.efficiency], ["Reliability", employee.reliability], ["Loyalty", employee.loyalty], ["Morale", employee.morale], ["Performance", employee.performance], ["Workload", employee.workload]].map(([label, value]) => <View key={label as string} style={s.stat}><Label>{label}</Label><Text style={s.value}>{typeof value === "number" ? `${value}%` : value}</Text></View>)}</Card>
    <Card style={s.card}><Label>Monthly salary</Label><Money value={employee.salary} /><Text style={s.copy}>Next payday {formatGameDate(employee.contractData.nextPayDate)}{employee.contractData.overdueAmount ? ` · €${employee.contractData.overdueAmount.toLocaleString()} overdue` : ""}</Text><Label>Traits</Label><Text style={s.traits}>{employee.traits.map((trait) => TRAIT_LABELS[trait]).join(" · ")}</Text></Card>
    {employee.training && <Card style={s.card}><Label>Training in progress</Label><Text style={s.copy}>{employee.training.level} · completes {formatGameDate(employee.training.completesAt)}</Text></Card>}
    <SectionTitle>Development</SectionTitle>{(Object.keys(TRAINING) as Array<keyof typeof TRAINING>).map((level) => <PrimaryButton key={level} title={`${level} TRAINING · €${TRAINING[level].cost.toLocaleString()} · ${TRAINING[level].days} DAYS`} tone="dark" disabled={Boolean(employee.training)} onPress={() => action(`${level} training`, `Cost €${TRAINING[level].cost.toLocaleString()}\nCompletion in ${TRAINING[level].days} game days.`, () => update((state) => trainEmployee(state, employee.id, level)))} />)}
    <PrimaryButton title="PROMOTE" onPress={() => action("Promote employee", "Promotion raises salary by 22%, improves morale and can unlock management capability.", () => update((state) => promoteEmployee(state, employee.id)))} />
    <PrimaryButton title="GIVE 10% SALARY RAISE" tone="dark" onPress={() => action("Salary raise", "Monthly costs rise by 10%. Morale and loyalty improve.", () => update((state) => raiseSalary(state, employee.id, 10)))} />
    <PrimaryButton title="FIRE EMPLOYEE" tone="danger" onPress={() => action("Fire employee", "Delegated tasks return to SELF. Full management may be disabled.", () => { update((state) => fireEmployee(state, employee.id)); router.replace("/staff" as Href); }, true)} />
    <SectionTitle>Employment history</SectionTitle>{employee.history.map((entry) => <Card key={entry.id} style={s.card}><Label>{entry.type} · {formatGameDate(entry.gameDate)}</Label><Text style={s.copy}>{entry.description}</Text></Card>)}
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg, padding: 18 }, content: { paddingTop: 38, paddingBottom: 100, gap: 12 }, kicker: { color: colors.gold, fontWeight: "900", letterSpacing: 1, marginTop: 8 }, title: { color: colors.text, fontSize: 30, fontWeight: "900" }, role: { color: colors.gold, fontSize: 16, fontWeight: "800" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 }, stat: { width: "44%" }, value: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 4 }, card: { gap: 10 }, copy: { color: colors.muted, lineHeight: 20 }, traits: { color: colors.green, fontWeight: "800" } });
