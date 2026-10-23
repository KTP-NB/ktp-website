import AuthGate from '@/components/authgate';
import MemberPermissionGate from '@/components/MemberPermissionGate';
import { MEMBER_PERMISSIONS } from '@/lib/memberAccess';
import RecruiterOutreach from './RecruiterOutreach';

export const metadata = { title: 'Recruiter Outreach | KTP New Brunswick' };

export default function RecruiterOutreachPage() {
  return <AuthGate><MemberPermissionGate permission={MEMBER_PERMISSIONS.RECRUITER_EMAILS}><RecruiterOutreach /></MemberPermissionGate></AuthGate>;
}
