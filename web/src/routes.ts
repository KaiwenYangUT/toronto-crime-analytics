import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/overview.tsx'),
  route('explore', 'routes/explore.tsx'),
  route('explain', 'routes/explain.tsx'),
  route('predict', 'routes/predict.tsx'),
  route('paper', 'routes/paper.tsx'),
  route('methods', 'routes/methods.tsx'),
  route('about', 'routes/about.tsx'),
] satisfies RouteConfig
