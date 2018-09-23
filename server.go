package graph

import (
	"net/http"
	"net/url"
	"path"

	"gopkg.in/gin-gonic/gin.v1"
)

func StartServer(user, pass, jiraHost, initialEstimateField, estimateField, flaggedField, sprintsField string) error {
	jc := jiraClient{
		host:                 jiraHost,
		user:                 user,
		pass:                 pass,
		initialEstimateField: initialEstimateField,
		estimateField:        estimateField,
		flaggedField:         flaggedField,
		sprintsField:         sprintsField,
	}
	gc := graphController{
		jc: jc,
	}

	r := gin.Default()
	r.LoadHTMLGlob("templates/*")
	r.Static("/assets", "./dist")

	r.GET("/api/epics/:key", gc.getEpicGraph)
	r.GET("/api/epics/:key/related", gc.getRelatedEpics)
	r.GET("/epics/:key", gc.getEpic)
	r.GET("/epics/:key/details", gc.redirectToJIRA)
	r.GET("/", gc.index)

	return r.Run()
}

type graphController struct {
	jc jiraClient
}

type graphResponse struct {
	Issues []issue             `json:"issues"`
	Graph  map[string][]string `json:"graph"`
}

func (gc graphController) getEpicGraph(c *gin.Context) {
	issues, err := getIssues(gc.jc, c.Param("key"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": http.StatusText(http.StatusInternalServerError)})
		return
	}

	if len(issues) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"status": http.StatusText(http.StatusNotFound)})
		return
	}

	resp := graphResponse{
		Issues: issues,
		Graph:  issuesToBlocksGraph(issues),
	}
	c.JSON(http.StatusOK, resp)
}

func (gc graphController) getEpic(c *gin.Context) {
	key := c.Param("key")
	issue, err := getSingleIssue(gc.jc, key)
	if err != nil {
		ebs, ok := err.(errBadStatus)
		if ok {
			if ebs.statusCode == http.StatusNotFound {
				c.HTML(http.StatusNotFound, "404.tmpl", gin.H{})
				return
			}
		}
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	if issue.Type != "Epic" {
		c.HTML(http.StatusNotFound, "404.tmpl", gin.H{})
		return
	}

	c.HTML(http.StatusOK, "epic.tmpl", gin.H{
		"issue":    issue,
		"jiraHost": gc.jc.host,
	})
}

func (gc graphController) redirectToJIRA(c *gin.Context) {
	key := c.Param("key")
	u := url.URL{
		Scheme: "https",
		Host:   gc.jc.host,
		Path:   path.Join("browse", key),
	}
	c.Redirect(http.StatusFound, u.String())
}

func (gc graphController) index(c *gin.Context) {
	c.HTML(http.StatusOK, "index.tmpl", nil)
}

func (gc graphController) getRelatedEpics(c *gin.Context) {
	issues, err := getRelatedEpics(gc.jc, c.Param("key"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": http.StatusText(http.StatusInternalServerError)})
		return
	}
	//TODO: handle a non existent-requested epic as a 404
	c.JSON(http.StatusOK, issues)
}
