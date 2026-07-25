import { createRoute } from 'honox/factory'
import App from '../islands/app'

export default createRoute((c) => {
  return c.render(<App />)
})
