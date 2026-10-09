'use client';

import JobBoardError from './components/JobBoardError';

export default function Error({ error, reset }) {
  return <JobBoardError error={error} reset={reset} />;
}
