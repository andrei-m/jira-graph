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
	r.GET("/epics/:key", gc.getEpicGraph)
	return r.Run()
}

type graphController struct {
	jc jiraClient
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

	blocksGraph := issuesToBlocksGraph(issues)
	c.JSON(http.StatusOK, blocksGraph)
}
