import { Component, PropsWithChildren } from 'react'
import './app.css'

// App shell. Taro mounts pages as children; the engine + adapters live in
// modules imported by individual pages.
export default class App extends Component<PropsWithChildren> {
  render() {
    return this.props.children
  }
}
