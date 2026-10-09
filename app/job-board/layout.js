import AuthGate from '@/components/authgate';
import MemberPermissionGate from '@/components/MemberPermissionGate';
import { MEMBER_PERMISSIONS } from '@/lib/memberAccess';
import JobBoardShell from './components/JobBoardShell';

export const metadata = {
  title: 'Job Board | KTP New Brunswick',
  description: 'Member-only KTP job board and application tracking tools.',
};

export default function JobBoardLayout({ children }) {
  return (
    <AuthGate>
      <MemberPermissionGate permission={MEMBER_PERMISSIONS.APPLICATIONS}>
        <JobBoardShell>{children}</JobBoardShell>
      </MemberPermissionGate>
    </AuthGate>
  );
}
