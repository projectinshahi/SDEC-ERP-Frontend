import { Candidate, JobOpening } from './recruitment.types';

export const JOB_OPENINGS: JobOpening[] = [
  {
    id: '1',
    title: 'MERN Developer',
    department: 'Engineering',
    applicants: 12,
    deadline: 'Jul 10',
    status: 'Open',
  },
  {
    id: '2',
    title: 'UI/UX Designer',
    department: 'Design',
    applicants: 8,
    deadline: 'Jul 3',
    status: 'Closing Soon',
  },
];

export const CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Rahul',
    role: 'MERN Developer',
    experience: '2 Years',
    matchScore: 87,
    skills: ['React', 'Node'],
    stage: 'Applied',
    email: 'rahul@test.com',
    phone: '9999999999',
  },
  {
    id: '2',
    name: 'Arjun',
    role: 'UI Designer',
    experience: '3 Years',
    matchScore: 91,
    skills: ['Figma', 'UX'],
    stage: 'Interview',
    email: 'arjun@test.com',
    phone: '8888888888',
  },
];