import React from 'react';
import { Link } from 'react-router-dom';
import '../../pages/404/404.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {   
            return { hasError: true };  }
    componentDidCatch(error, errorInfo) {   
    }
    render() {
      if (this.state.hasError) {         
        return( <div>
        <section className="page_404">
          <div className="page_404_bg">
            <h1 className="header_main ">404</h1>
          </div>

          <div className="content_box_404">
            <h3 className="content_header">Look like you're lost</h3>
            <p>The page you are looking for not avaible!</p>
            <Link to="/home" className="link_404">
              Go to Home
            </Link>
          </div>
        </section>
    </div>)  
    }
      return this.props.children; 
    }
  }

  export default ErrorBoundary