import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { Card, Label, PrimaryButton, SectionTitle } from "@/components/ui";
import { ROLE_LABELS, ROLE_TASKS, TASK_LABELS } from "@/game/employees/config";
import { assignTask, setManagementMode } from "@/game/employees/employees";
import type { Employee, StaffTask } from "@/game/employees/types";
import { useGameStore } from "@/store/gameStore";
import { colors } from "@/theme";

export default function Management() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const game = useGameStore((state) => state.game), update = useGameStore((state) => state.update);
  if (!game) return null;
  const business = game.businesses.find((item) => item.id === businessId) ?? game.businesses[0], employees = game.staff.employees.filter((employee) => employee.businessId === business.id);
  const managers = employees.filter((employee) => ["BUSINESS_MANAGER", "GENERAL_MANAGER", "DEALERSHIP_MANAGER"].includes(employee.role));
  const choose = (task: StaffTask) => {
    const compatible = employees.filter((employee) => ROLE_TASKS[employee.role].includes(task));
    Alert.alert(TASK_LABELS[task], "Who should own this task?", [
      { text: "SELF", onPress: () => update((state) => assignTask(state, business.id, task, "SELF")) },
      ...compatible.slice(0, 4).map((employee) => ({ text: `${employee.firstName} · ${employee.performance}%`, onPress: () => { try { update((state) => assignTask(state, business.id, task, ["TEAM_LEADER", "BUSINESS_MANAGER", "GENERAL_MANAGER", "SALES_MANAGER", "DEALERSHIP_MANAGER", "INVENTORY_MANAGER"].includes(employee.role) ? "MANAGER" : "EMPLOYEE", employee.id)); } catch (error) { Alert.alert("Delegation failed", (error as Error).message); } } })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };
  const full = () => {
    if (!managers.length) return Alert.alert("Manager required", "Hire a compatible Business, Dealership or General Manager first.");
    const buttons = managers.map((manager) => ({ text: `${manager.firstName} · ${ROLE_LABELS[manager.role]}`, onPress: () => update((state) => setManagementMode(state, business.id, "FULLY_MANAGED", manager.id)) }));
    Alert.alert("Full management", "Choose the manager responsible for all operations.", [...buttons, { text: "Cancel", style: "cancel" as const }]);
  };
  const employeeName = (id?: string) => { const found: Employee | undefined = employees.find((employee) => employee.id === id); return found ? `${found.firstName} ${found.lastName}` : "Player"; };
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <PrimaryButton title="‹ BUSINESS" tone="dark" onPress={() => router.replace(business.type === "CAR_DEALERSHIP" ? "/dealership" as Href : "/(tabs)/business")} />
    <Text style={s.kicker}>OPERATIONS CONTROL</Text><Text style={s.title}>Management</Text>
    <Card style={s.hero}><Label>Current mode</Label><Text style={s.score}>{business.management.mode.replaceAll("_", " ")}</Text><Label>Dynamic automation efficiency</Label><Text style={s.score}>{business.management.automationEfficiency}%</Text><Text style={s.copy}>Quality changes with skill, performance, reliability, morale, leadership and task coverage. Even elite full management is capped below 100%.</Text></Card>
    <SectionTitle>Management mode</SectionTitle>
    <PrimaryButton title="SELF MANAGED · 100% ACTIVE CONTROL" tone={business.management.mode === "SELF_MANAGED" ? "gold" : "dark"} onPress={() => update((state) => setManagementMode(state, business.id, "SELF_MANAGED"))} />
    <PrimaryButton title="PARTIALLY DELEGATED" tone={business.management.mode === "PARTIALLY_DELEGATED" ? "gold" : "dark"} onPress={() => update((state) => setManagementMode(state, business.id, "PARTIALLY_DELEGATED"))} />
    <PrimaryButton title="FULLY MANAGED · MANAGER REQUIRED" tone={business.management.mode === "FULLY_MANAGED" ? "gold" : "dark"} onPress={full} />
    <SectionTitle>Task delegation</SectionTitle>{business.management.delegations.map((assignment) => { const task = assignment.task; return <Card key={task} style={s.task}><View style={s.row}><View style={{ flex: 1 }}><Text style={s.taskTitle}>{TASK_LABELS[task]}</Text><Text style={s.copy}>{assignment.mode} · {employeeName(assignment.employeeId)}</Text></View><Text style={s.mode}>{assignment.mode}</Text></View><PrimaryButton title="CHANGE ASSIGNMENT" tone="dark" onPress={() => choose(task)} /></Card>; })}
    <Card><Text style={s.copy}>Delegated buying selects positive-margin stock while protecting part of upcoming payroll. Delegated listing prices products according to employee skill. Existing sales resolution remains active and employee quality influences the operational foundation.</Text></Card>
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { padding: 18, paddingTop: 55, paddingBottom: 100, gap: 12 }, kicker: { color: colors.gold, fontWeight: "900", letterSpacing: 1, marginTop: 8 }, title: { color: colors.text, fontSize: 32, fontWeight: "900" }, hero: { gap: 10 }, score: { color: colors.text, fontSize: 24, fontWeight: "900" }, copy: { color: colors.muted, lineHeight: 20 }, task: { gap: 12 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, taskTitle: { color: colors.text, fontSize: 17, fontWeight: "900" }, mode: { color: colors.gold, fontWeight: "900" } });
