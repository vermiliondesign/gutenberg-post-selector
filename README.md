# Gutenberg PostSelector

This is a React component built for Gutenberg that allows you to attach pages and posts like AddBySearch in the WP 5.0+ editor. 

NOTE: Since this package does not stand on its own and requires the WordPress `{wp}` object to be available, there are no npm dependencies or task runners in this repo. When you include the file in your block, create-guten-block's runner should take care of the rest.


## Installation
cd to your custom block plugin directory.

`npm install @vermilion/post-selector`

## Usage

block.js
```
/**
 * BLOCK: Block Name
 */
//  Import CSS.
import './style.scss';
// import './editor.scss';

import PostSelector from './PostSelector';

const { registerBlockType } = wp.blocks;
const { Fragment, RawHTML } = wp.element;
const { InspectorControls } = wp.editor;
const { PanelBody } = wp.components;

registerBlockType('vermilion/post-selector', {
  title: 'Post Selector',
  // icon: '',
  category: 'widgets',
  keywords: [''],
  attributes: {
    posts: {
      type: 'array',
      default: []
    },
  },

  edit({ attributes, setAttributes }) {
    return (
      <Fragment>
        <InspectorControls>
          <PanelBody title="Post Selector">
          
            <PostSelector
              onPostSelect={post => {
                attributes.posts.push(post);
                setAttributes({ posts: [...attributes.posts] });
              }}
              posts={attributes.posts}
              onChange={newValue => {
                setAttributes({ posts: [...newValue] });
              }}
            />

          </PanelBody>
        </InspectorControls>
        <div>
          {attributes.posts.map(post => (
            <div>
              #{post.id}
              <h2>{post.title}</h2>
              <RawHTML>{post.excerpt}</RawHTML>
            </div>
          ))}
        </div>
      </Fragment>
    );
  },

  save({ attributes }) {
    return(
      <div>
        {attributes.posts.map(post => (
          <div>
            #{post.id}
            <h2>{post.title}</h2>
            <RawHTML>{post.excerpt}</RawHTML>
          </div>
        ))}
      </div>
    )
  }
});

```

