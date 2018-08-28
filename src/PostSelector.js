const { Component, Fragment } = wp.element;
const { decodeEntities } = wp.htmlEntities;
const { UP, DOWN, ENTER } = wp.keycodes;
const { Spinner, Popover, IconButton } = wp.components;
const { withInstanceId } = wp.compose;
const { apiFetch } = wp;
const { addQueryArgs } = wp.url;

const stopEventPropagation = event => event.stopPropagation();

function debounce(func, wait = 100) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

class PostSelector extends Component {
  constructor() {
    super(...arguments);

    this.onChange = this.onChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.bindListNode = this.bindListNode.bind(this);
    this.updateSuggestions = debounce(this.updateSuggestions.bind(this), 200);

    this.suggestionNodes = [];

    this.state = {
      posts: [],
      showSuggestions: false,
      selectedSuggestion: null,
      input: ''
    };
  }

  componentDidUpdate() { }

  componentWillUnmount() {
    delete this.suggestionsRequest;
  }

  bindListNode(ref) {
    this.listNode = ref;
  }

  bindSuggestionNode(index) {
    return ref => {
      this.suggestionNodes[index] = ref;
    };
  }

  updateSuggestions(value) {
    // Show the suggestions after typing at least 2 characters
    // and also for URLs
    if (value.length < 2 || /^https?:/.test(value)) {
      this.setState({
        showSuggestions: false,
        selectedSuggestion: null,
        loading: false
      });

      return;
    }

    this.setState({
      showSuggestions: true,
      selectedSuggestion: null,
      loading: true
    });

    const request = apiFetch({
      path: addQueryArgs('/gutenberg/v1/search', {
        search: value,
        per_page: 20,
        type: 'post'
      })
    });

    request
      .then(posts => {
        // A fetch Promise doesn't have an abort option. It's mimicked by
        // comparing the request reference in on the instance, which is
        // reset or deleted on subsequent requests or unmounting.
        if (this.suggestionsRequest !== request) {
          return;
        }

        this.setState({
          posts,
          loading: false
        });
      })
      .catch(() => {
        if (this.suggestionsRequest === request) {
          this.setState({
            loading: false
          });
        }
      });

    this.suggestionsRequest = request;
  }

  onChange(event) {
    const inputValue = event.target.value;
    this.setState({ input: inputValue });
    this.updateSuggestions(inputValue);
  }

  onKeyDown(event) {
    const { showSuggestions, selectedSuggestion, posts, loading } = this.state;
    // If the suggestions are not shown or loading, we shouldn't handle the arrow keys
    // We shouldn't preventDefault to allow block arrow keys navigation
    if (!showSuggestions || !posts.length || loading) {
      return;
    }

    switch (event.keyCode) {
      case UP: {
        event.stopPropagation();
        event.preventDefault();
        const previousIndex = !selectedSuggestion ? posts.length - 1 : selectedSuggestion - 1;
        this.setState({
          selectedSuggestion: previousIndex
        });
        break;
      }
      case DOWN: {
        event.stopPropagation();
        event.preventDefault();
        const nextIndex = selectedSuggestion === null || selectedSuggestion === posts.length - 1 ? 0 : selectedSuggestion + 1;
        this.setState({
          selectedSuggestion: nextIndex
        });
        break;
      }
      case ENTER: {
        if (this.state.selectedSuggestion !== null) {
          event.stopPropagation();
          const post = this.state.posts[this.state.selectedSuggestion];
          this.selectLink(post);
        }
      }
    }
  }

  selectLink(post) {
    // get the "full" post data if a post was selected. this may be something to add as a prop in the future for custom use cases.
    apiFetch({
      path: `/wp/v2/${post.subtype}s/${post.id}`
    }).then(response => {
      const fullpost = {
        title: decodeEntities(response.title.rendered),
        id: response.id,
        excerpt: decodeEntities(response.excerpt.rendered),
        url: response.link
      };
      // send data to the block;
      this.props.onPostSelect(fullpost);
    });
    this.setState({
      input: '',
      selectedSuggestion: null,
      showSuggestions: false
    });
  }

  renderSelectedPosts() {
    // show each post in the list.
    return (
      <ul>
        {this.props.posts.map((post, i) => (
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'nowrap' }}>
            <span style={{ maxWidth: '60%' }}>{post.title}</span>
            <span>
              {i !== 0 ? (
                <IconButton
                  style={{ display: 'inline-flex', padding: '8px 2px', textAlign: 'center' }}
                  icon="arrow-up-alt2"
                  onClick={() => {
                    this.props.posts.splice(i - 1, 0, this.props.posts.splice(i, 1)[0]);
                    this.props.onChange(this.props.posts);
                    this.setState({ state: this.state });
                  }}
                />
              ) : null}

              {i !== this.props.posts.length - 1 ? (
                <IconButton
                  style={{ display: 'inline-flex', padding: '8px 2px', textAlign: 'center' }}
                  icon="arrow-down-alt2"
                  onClick={() => {
                    this.props.posts.splice(i + 1, 0, this.props.posts.splice(i, 1)[0]);
                    this.props.onChange(this.props.posts);
                    this.setState({ state: this.state });
                  }}
                />
              ) : null}

              <IconButton
                style={{ display: 'inline-flex', textAlign: 'center' }}
                icon="no"
                onClick={() => {
                  this.props.posts.splice(i, 1);
                  this.props.onChange(this.props.posts);
                  // force a re-render.
                  this.setState({ state: this.state });
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  render() {
    const { autoFocus = true, instanceId } = this.props;
    const { showSuggestions, posts, selectedSuggestion, loading, input } = this.state;
    /* eslint-disable jsx-a11y/no-autofocus */
    return (
      <Fragment>
        {this.renderSelectedPosts()}
        <div className="editor-url-input">
          <input autoFocus={autoFocus} type="text" aria-label={'URL'} required value={input} onChange={this.onChange} onInput={stopEventPropagation} placeholder={'Type page or post name'} onKeyDown={this.onKeyDown} role="combobox" aria-expanded={showSuggestions} aria-autocomplete="list" aria-owns={`editor-url-input-suggestions-${instanceId}`} aria-activedescendant={selectedSuggestion !== null ? `editor-url-input-suggestion-${instanceId}-${selectedSuggestion}` : undefined} />

          {loading && <Spinner />}
        </div>

        {showSuggestions &&
          !!posts.length && (
            <Popover position="bottom" noArrow focusOnMount={false}>
              <div className="editor-url-input__suggestions" id={`editor-url-input-suggestions-${instanceId}`} ref={this.bindListNode} role="listbox">
                {posts.map((post, index) => (
                  <button key={post.id} role="option" tabIndex="-1" id={`editor-url-input-suggestion-${instanceId}-${index}`} ref={this.bindSuggestionNode(index)} className={`editor-url-input__suggestion ${index === selectedSuggestion ? 'is-selected' : ''}`} onClick={() => this.selectLink(post)} aria-selected={index === selectedSuggestion}>
                    {decodeEntities(post.title) || '(no title)'}
                  </button>
                ))}
              </div>
            </Popover>
          )}
      </Fragment>
    );
    /* eslint-enable jsx-a11y/no-autofocus */
  }
}

export default withInstanceId(PostSelector);
