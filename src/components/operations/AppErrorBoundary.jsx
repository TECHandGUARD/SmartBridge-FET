import React from 'react';
export default class AppErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.report?.('render_error');}
 render(){if(this.state.failed)return <main role="alert" className="p-8 text-center"><h1>Something went wrong</h1><p>Please reload to try again.</p><button type="button" onClick={()=>window.location.reload()}>Reload</button></main>;return this.props.children;}
}
