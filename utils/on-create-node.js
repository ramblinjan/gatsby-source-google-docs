const {createRemoteFileNode} = require("gatsby-source-filesystem")

const GOOGLE_IMAGE_REGEX = /https:\/\/[a-z0-9]*.googleusercontent\.com\/[a-zA-Z0-9_-]*/

exports.onCreateNode = async ({
  node,
  actions: {createNode, createNodeField},
  store,
  cache,
  createNodeId,
  reporter,
}) => {
  if (node.internal.type !== "MarkdownRemark") {
    return
  }

  createNodeField({
    node,
    name: `slug`,
    value: node.frontmatter.path,
  })

  if (
    node.frontmatter.cover &&
    GOOGLE_IMAGE_REGEX.test(node.frontmatter.cover.image)
  ) {
    let fileNode
    try {
      const url = node.frontmatter.cover.image

      fileNode = await createRemoteFileNode({
        url,
        parentNodeId: node.id,
        createNode,
        createNodeId,
        cache,
        store,
        name: "google-docs-image-" + createNodeId(url),
        ext: ".png",
        reporter,
      })
    } catch (e) {
      reporter.warn(`source-google-docs: ${e}`)
    }

    if (fileNode) {
      delete node.frontmatter.cover.image
      node.frontmatter.cover.image___NODE = fileNode.id
    }
  }

  const googleUrls = node.internal.content.match(
    new RegExp(GOOGLE_IMAGE_REGEX.source, "g")
  )
  if (Array.isArray(googleUrls)) {
    const filesNodes = await Promise.all(
      googleUrls.map(async url => {
        let fileNode

        try {
          fileNode = await createRemoteFileNode({
            url,
            parentNodeId: node.id,
            createNode,
            createNodeId,
            cache,
            store,
            name: "google-docs-image-" + createNodeId(url),
            ext: ".png",
            reporter,
          })
        } catch (e) {
          reporter.warn(`source-google-docs: ${e}`)
        }

        return fileNode
      })
    )

    filesNodes
      .filter(fileNode => fileNode)
      .forEach(fileNode => {
        node.internal.content = node.internal.content.replace(
          new RegExp(fileNode.url, "g"),
          fileNode.relativePath
        )
        node.rawMarkdownBody = node.rawMarkdownBody.replace(
          new RegExp(fileNode.url, "g"),
          fileNode.relativePath
        )
      })

    node.frontmatter.images___NODE = filesNodes
      .filter(fileNode => fileNode)
      .map(fileNode => fileNode.id)
  }
}
