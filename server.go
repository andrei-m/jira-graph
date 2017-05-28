package graph

import (
	"net/http"

	"gopkg.in/gin-gonic/gin.v1"
)

func StartServer(user, pass, jiraHost string) error {
	jc := jiraClient{
		host: jiraHost,
		user: user,
		pass: pass,
	}
	gc := graphController{jc}

	r := gin.Default()
	r.LoadHTMLGlob("templates/*")
	r.StaticFile("/app.js", "./static/app.js")
	r.StaticFile("/style.css", "./static/style.css")

	r.GET("/api/epics/:key", gc.getEpicGraph)
	r.GET("/epics/:key", gc.getEpic)

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
	c.HTML(http.StatusOK, "index.tmpl", gin.H{
		"issue": issue,
	})
}
