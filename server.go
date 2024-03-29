package graph

import (
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"path"

	"github.com/gin-gonic/gin"
)

var (
	//go:embed dist
	distFS embed.FS
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
	if err := r.SetTrustedProxies(nil); err != nil {
		return err
	}

	// this roundabout way of implementing FileFromFS is needed because of the index.html special case: https://github.com/gin-gonic/gin/issues/2654
	templates, err := template.ParseFS(distFS, "dist/*.html")
	if err != nil {
		log.Panic(err)
	}
	r.SetHTMLTemplate(templates)

	r.GET("/api/epics/:key", gc.getEpicGraph)
	r.GET("/api/issues/:key", gc.getIssue)
	r.GET("/api/issues/:key/related", gc.getRelatedIssues)
	r.GET("/api/issues/:key/details", gc.redirectToJIRA)
	r.GET("/api/milestones/:key", gc.getMilestoneGraph)

	spaHandler := func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	}
	r.GET("/", spaHandler)
	r.GET("/index.html", spaHandler)
	r.NoRoute(spaHandler)

	assets, err := fs.Sub(distFS, "dist/assets")
	if err != nil {
		log.Println("dist/assets could not be resolved; the server will only provide '/api' resources")
	} else {
		r.StaticFS("/assets", http.FS(assets))
	}

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

type issueResponse struct {
	JiraHost string `json:"jiraHost"`
	Issue    issue  `json:"issue"`
}

func (gc graphController) getIssue(c *gin.Context) {
	key := c.Param("key")
	issue, err := getSingleIssue(gc.jc, key)
	if err != nil {
		ebs, ok := err.(errBadStatus)
		if ok {
			if ebs.statusCode == http.StatusNotFound {
				c.JSON(http.StatusNotFound, gin.H{"status": http.StatusText(http.StatusNotFound)})
				return
			}
		}
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	if issue.Type != "Epic" && issue.Type != "Milestone" {
		c.JSON(http.StatusNotFound, gin.H{"status": http.StatusText(http.StatusNotFound)})
		return
	}

	c.JSON(http.StatusOK, issueResponse{JiraHost: gc.jc.host, Issue: issue})
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

func (gc graphController) getRelatedIssues(c *gin.Context) {
	issues, err := getRelatedIssues(gc.jc, c.Param("key"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": http.StatusText(http.StatusInternalServerError)})
		return
	}
	//TODO: handle a non existent-requested epic as a 404
	c.JSON(http.StatusOK, issues)
}
