//"Go to login first" redirect - initial routing for the app
import { Redirect } from 'expo-router';

export default function Redirecting() {
  return <Redirect href="/login" />;
}
