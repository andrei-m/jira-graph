package graph

import (
	"net/http"
	"net/url"
	"path"

	"gopkg.in/gin-gonic/gin.v1"
)

func StartServer(user, pass, jiraHost string, fc FieldConfig) error {
	jc := jiraClient{
		host:        jiraHost,
		user:        user,
		pass:        pass,
		fieldConfig: fc,
	}
	gc := graphController{
		jc: jc,
	}

	r := gin.Default()
	r.LoadHTMLGlob("templates/*")
	r.Static("/assets", "./dist")

	r.GET("/api/epics/:key", gc.getEpicGraph)
	r.GET("/api/issues/:key/related", gc.getRelatedEpics)
	r.GET("/api/milestones/:key", gc.getMilestoneGraph)
	r.GET("/epics/:key", gc.getIssue)
	r.GET("/epics/:key/details", gc.redirectToJIRA)
	r.GET("/issues/:key", gc.getIssue)
	r.GET("/issues/:key/details", gc.redirectToJIRA)
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

func (gc graphController) getMilestoneGraph(c *gin.Context) {
	epics, err := getMilestoneEpics(gc.jc, c.Param("key"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": http.StatusText(http.StatusInternalServerError)})
		return
	}
	if len(epics) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"status": http.StatusText(http.StatusNotFound)})
		return
	}

	epicKeys := make([]string, len(epics))
	for i := range epics {
		epicKeys[i] = epics[i].Key
	}

	issues, err := getIssues(gc.jc, epicKeys...)
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

func (gc graphController) getIssue(c *gin.Context) {
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

	if issue.Type != "Epic" && issue.Type != "Milestone" {
		c.HTML(http.StatusNotFound, "404.tmpl", gin.H{})
		return
	}

	c.HTML(http.StatusOK, "issue.tmpl", gin.H{
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
