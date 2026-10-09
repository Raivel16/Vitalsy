import { useLocalSearchParams } from 'expo-router';
import { MedicationScreen } from '../../../../modules/plan/ui/PlanScreens';

export default function MedicationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MedicationScreen id={id ?? ''} />;
}
