import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class Button extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selected: false};
    }
    render () {
        return (
            <button className='SidebarButton' id={this.props.id}>
                {this.props.value}
            </button>
        )
    }
}

class Sidebar extends React.Component {
    renderButton(x,btnid) {
        return <Button value={x} id={btnid}/>;
    }

    render() {
        return (
            <div id='SidebarMain' className='BackgroundElement'>
                <h2>Navigation</h2>
                {this.renderButton("Feed","FirstButton")}
                {this.renderButton("Your profile")}
                {this.renderButton("Settings")}
            </div>
        )
    }
}

class Friendbar extends React.Component {
    render() {
        return (
            <div id='FriendbarMain' className='BackgroundElement'>
                <h2>Friends</h2>
            </div>
        )
    }
}

class Body extends React.Component {
    render() {
        return (
            <div id='BodyMain' className='BackgroundElement'>
                Body
            </div>
        )
    }
}

class Topbar extends React.Component {
    render() {
        return (
            <div id='Topbar' className='BackgroundElement'>
                <form>
                    <input type='text' placeholder='Search' id='SearchInput' />
                </form>
            </div>
        )
    }
}

class Main extends React.Component {
    renderBody() {
        return <Body />;
    }

    renderSidebar() {
        return <Sidebar />;
    }

    render() {
        return (
            <div className='Main'>
                <div id='Top'>
                    <Topbar />
                </div>
                <div id='Bottom'>
                    <Sidebar />
                    <Body />
                    <Friendbar />
                </div>
            </div>
        )
    }
}

function App() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    fetch("/api")
      .then((res) => res.json())
      .then((data) => setData(data.message));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>{!data ? "Loading..." : data}</p>
      </header>
    </div>
  );
}

ReactDOM.render(
    <Main />,
    document.getElementById('root')
);