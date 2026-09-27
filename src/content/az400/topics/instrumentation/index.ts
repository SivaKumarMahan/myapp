import type { Topic } from '../../../types'
import { appInsightsMonitoring } from './app-insights-monitoring'
import { kqlAnalysis } from './kql-analysis'

/** Lessons in this domain, in teaching order. */
export const az400InstrumentationTopics: Topic[] = [appInsightsMonitoring, kqlAnalysis]
