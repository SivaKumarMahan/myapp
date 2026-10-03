import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AccessProvider } from './lib/access-provider'
import { useAccess } from './lib/use-access'
import { ProgressProvider } from './lib/progress-provider'
import { AppShell } from './components/layout/AppShell'
import { PwaUpdater } from './components/PwaUpdater'
import { HomePage } from './pages/HomePage'
import { CourseDashboardPage } from './pages/CourseDashboardPage'
import { TopicPage } from './pages/TopicPage'
import { SearchPage } from './pages/SearchPage'
import { PracticePage } from './pages/PracticePage'
import { QuizPage } from './pages/QuizPage'
import { ExamsPage } from './pages/ExamsPage'
import { ExamRunnerPage } from './pages/ExamRunnerPage'
import { ExamReviewPage } from './pages/ExamReviewPage'
import { CommandsPage } from './pages/CommandsPage'
import { ProgressPage } from './pages/ProgressPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { CourseDashboardRedirect } from './pages/CourseDashboardRedirect'
import { InterviewHubPage } from './pages/InterviewHubPage'
import { InterviewTopicPage } from './pages/InterviewTopicPage'
import { InterviewReviewPage } from './pages/InterviewReviewPage'
import { SignInPage } from './pages/SignInPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { ReviewPage } from './pages/ReviewPage'
import { MistakesPage } from './pages/MistakesPage'
import { CourseStatsPage, StatsPage } from './pages/StatsPage'

/*
 * The SQL playground pulls in SQLite (WebAssembly) and CodeMirror, so it is
 * loaded only when one of its pages is opened. The service worker still
 * precaches the files, so it works offline once the app is installed.
 */
const sqlPages = () => import('./pages/SqlPages')
const SqlPlaygroundPage = lazy(() => sqlPages().then((m) => ({ default: m.SqlPlaygroundPage })))
const SqlChallengesPage = lazy(() => sqlPages().then((m) => ({ default: m.SqlChallengesPage })))
const SqlChallengePage = lazy(() => sqlPages().then((m) => ({ default: m.SqlChallengePage })))

const kqlPages = () => import('./pages/KqlPages')
const KqlPlaygroundPage = lazy(() => kqlPages().then((m) => ({ default: m.KqlPlaygroundPage })))
const KqlChallengesPage = lazy(() => kqlPages().then((m) => ({ default: m.KqlChallengesPage })))
const KqlChallengePage = lazy(() => kqlPages().then((m) => ({ default: m.KqlChallengePage })))

const pythonPages = () => import('./pages/PythonPages')
const PythonPlaygroundPage = lazy(() =>
  pythonPages().then((m) => ({ default: m.PythonPlaygroundPage })),
)
const PythonChallengesPage = lazy(() =>
  pythonPages().then((m) => ({ default: m.PythonChallengesPage })),
)
const PythonChallengePage = lazy(() =>
  pythonPages().then((m) => ({ default: m.PythonChallengePage })),
)

const ConfigLabPage = lazy(() =>
  import('./pages/ConfigLabPage').then((m) => ({ default: m.ConfigLabPage })),
)
const NetworkLabPage = lazy(() =>
  import('./pages/NetworkLabPage').then((m) => ({ default: m.NetworkLabPage })),
)
const CliPage = lazy(() => import('./pages/CliPage').then((m) => ({ default: m.CliPage })))
const BotPage = lazy(() => import('./pages/BotPage').then((m) => ({ default: m.BotPage })))
const VisualisePage = lazy(() =>
  import('./pages/VisualisePage').then((m) => ({ default: m.VisualisePage })),
)
const ArchitecturePage = lazy(() =>
  import('./pages/ArchitecturePage').then((m) => ({ default: m.ArchitecturePage })),
)
const MockInterviewPage = lazy(() =>
  import('./pages/MockInterviewPage').then((m) => ({ default: m.MockInterviewPage })),
)
const StoriesPage = lazy(() =>
  import('./pages/StoriesPage').then((m) => ({ default: m.StoriesPage })),
)
const PacksPage = lazy(() => import('./pages/PacksPage').then((m) => ({ default: m.PacksPage })))
const IncidentLabsPage = lazy(() =>
  import('./pages/IncidentLabsPage').then((m) => ({ default: m.IncidentLabsPage })),
)
const GuidedLabsPage = lazy(() =>
  import('./pages/GuidedLabsPage').then((m) => ({ default: m.GuidedLabsPage })),
)
const IacComparePage = lazy(() =>
  import('./pages/IacComparePage').then((m) => ({ default: m.IacComparePage })),
)
const GlossaryPage = lazy(() =>
  import('./pages/GlossaryPage').then((m) => ({ default: m.GlossaryPage })),
)
const CheatSheetPage = lazy(() =>
  import('./pages/CheatSheetPage').then((m) => ({ default: m.CheatSheetPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const rolesPages = () => import('./pages/RolesPages')
const RolesOverviewPage = lazy(() => rolesPages().then((m) => ({ default: m.RolesOverviewPage })))
const RoleDetailPage = lazy(() => rolesPages().then((m) => ({ default: m.RoleDetailPage })))
const RolesMatrixPage = lazy(() => rolesPages().then((m) => ({ default: m.RolesMatrixPage })))
const RolesComparePage = lazy(() => rolesPages().then((m) => ({ default: m.RolesComparePage })))
const RolesFitPage = lazy(() => rolesPages().then((m) => ({ default: m.RolesFitPage })))
const RolesToolsPage = lazy(() => rolesPages().then((m) => ({ default: m.RolesToolsPage })))

const Loading = ({ children }: { children: ReactNode }) => (
  <Suspense
    fallback={
      <div className="page">
        <p className="subtle">Loading…</p>
      </div>
    }
  >
    {children}
  </Suspense>
)

/**
 * The route table.
 *
 * Two sections sit side by side: certification courses under
 * `/:courseId/...`, and interview preparation under `/interview/...`.
 *
 * Installing another course is purely a content change. Static paths such as
 * `/progress` and `/interview` are ranked above the dynamic `:courseId`
 * segment by the router, so they win without needing to be declared first.
 *
 * `basename` comes from Vite's BASE_URL so the same build works at a domain
 * root and under a GitHub Pages repository sub-path.
 */
function Routed() {
  return (
    <>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route
              path="/sql"
              element={
                <Loading>
                  <SqlPlaygroundPage />
                </Loading>
              }
            />
            <Route
              path="/sql/challenges"
              element={
                <Loading>
                  <SqlChallengesPage />
                </Loading>
              }
            />
            <Route
              path="/sql/challenges/:challengeId"
              element={
                <Loading>
                  <SqlChallengePage />
                </Loading>
              }
            />
            <Route
              path="/network"
              element={
                <Loading>
                  <NetworkLabPage />
                </Loading>
              }
            />
            <Route
              path="/lab"
              element={
                <Loading>
                  <ConfigLabPage />
                </Loading>
              }
            />
            <Route
              path="/roles"
              element={
                <Loading>
                  <RolesOverviewPage />
                </Loading>
              }
            />
            <Route
              path="/roles/matrix"
              element={
                <Loading>
                  <RolesMatrixPage />
                </Loading>
              }
            />
            <Route
              path="/roles/compare"
              element={
                <Loading>
                  <RolesComparePage />
                </Loading>
              }
            />
            <Route
              path="/roles/fit"
              element={
                <Loading>
                  <RolesFitPage />
                </Loading>
              }
            />
            <Route
              path="/roles/tools"
              element={
                <Loading>
                  <RolesToolsPage />
                </Loading>
              }
            />
            <Route
              path="/roles/:roleId"
              element={
                <Loading>
                  <RoleDetailPage />
                </Loading>
              }
            />
            <Route
              path="/interview/mock"
              element={
                <Loading>
                  <MockInterviewPage />
                </Loading>
              }
            />
            <Route
              path="/interview/stories"
              element={
                <Loading>
                  <StoriesPage />
                </Loading>
              }
            />
            <Route
              path="/interview/packs"
              element={
                <Loading>
                  <PacksPage />
                </Loading>
              }
            />
            <Route
              path="/incidents"
              element={
                <Loading>
                  <IncidentLabsPage />
                </Loading>
              }
            />
            <Route
              path="/guided-labs"
              element={
                <Loading>
                  <GuidedLabsPage />
                </Loading>
              }
            />
            <Route
              path="/guided-labs/:labId"
              element={
                <Loading>
                  <GuidedLabsPage />
                </Loading>
              }
            />
            <Route
              path="/iac"
              element={
                <Loading>
                  <IacComparePage />
                </Loading>
              }
            />
            <Route
              path="/glossary"
              element={
                <Loading>
                  <GlossaryPage />
                </Loading>
              }
            />
            <Route
              path="/:courseId/cheatsheet"
              element={
                <Loading>
                  <CheatSheetPage />
                </Loading>
              }
            />
            <Route
              path="/settings"
              element={
                <Loading>
                  <SettingsPage />
                </Loading>
              }
            />
            <Route
              path="/architecture"
              element={
                <Loading>
                  <ArchitecturePage />
                </Loading>
              }
            />
            <Route
              path="/visualise"
              element={
                <Loading>
                  <VisualisePage />
                </Loading>
              }
            />
            <Route
              path="/bot"
              element={
                <Loading>
                  <BotPage />
                </Loading>
              }
            />
            <Route
              path="/cli"
              element={
                <Loading>
                  <CliPage />
                </Loading>
              }
            />
            <Route
              path="/python"
              element={
                <Loading>
                  <PythonPlaygroundPage />
                </Loading>
              }
            />
            <Route
              path="/python/challenges"
              element={
                <Loading>
                  <PythonChallengesPage />
                </Loading>
              }
            />
            <Route
              path="/python/challenges/:challengeId"
              element={
                <Loading>
                  <PythonChallengePage />
                </Loading>
              }
            />
            <Route
              path="/kql"
              element={
                <Loading>
                  <KqlPlaygroundPage />
                </Loading>
              }
            />
            <Route
              path="/kql/challenges"
              element={
                <Loading>
                  <KqlChallengesPage />
                </Loading>
              }
            />
            <Route
              path="/kql/challenges/:challengeId"
              element={
                <Loading>
                  <KqlChallengePage />
                </Loading>
              }
            />
            <Route path="/interview" element={<InterviewHubPage />} />
            {/* Static, so it is ranked above /interview/:topicId. */}
            <Route path="/interview/review" element={<InterviewReviewPage />} />
            <Route path="/interview/:topicId" element={<InterviewTopicPage />} />
            <Route path="/:courseId" element={<CourseDashboardPage />} />
            <Route path="/:courseId/topics/:topicId" element={<TopicPage />} />
            <Route path="/:courseId/search" element={<SearchPage />} />
            <Route path="/:courseId/practice" element={<PracticePage />} />
            <Route path="/:courseId/practice/:domainId" element={<QuizPage />} />
            <Route path="/:courseId/exams" element={<ExamsPage />} />
            <Route path="/:courseId/exams/run" element={<ExamRunnerPage />} />
            <Route path="/:courseId/exams/attempts/:attemptId" element={<ExamReviewPage />} />
            <Route path="/:courseId/commands" element={<CommandsPage />} />
            <Route path="/:courseId/stats" element={<CourseStatsPage />} />
            {/* Convenience redirect for anyone who bookmarks the old path. */}
            <Route path="/:courseId/dashboard" element={<CourseDashboardRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <PwaUpdater />
    </>
  )
}

/**
 * The gate, then the app.
 *
 * Nothing routed renders until somebody on the access list has signed in,
 * because the signed-in address is what selects the progress record. Keying
 * the provider on that address means switching learner tears down the old
 * provider entirely, so no part of one person's progress can survive into the
 * next person's session.
 */
function Gated() {
  const { email } = useAccess()
  if (!email) return <SignInPage />
  return (
    <ProgressProvider key={email} userEmail={email}>
      <Routed />
    </ProgressProvider>
  )
}

export function App() {
  return (
    <AccessProvider>
      <Gated />
    </AccessProvider>
  )
}
