from diagrams import Cluster, Diagram, Edge
from diagrams.aws.network import Cloudfront
from diagrams.aws.storage import S3
from diagrams.onprem.client import Users, User
from diagrams.aws.compute import Lambda
from diagrams.aws.network import APIGateway
from diagrams.onprem.compute import Server

with Diagram("Dynamic Rendering Lambda Edge", show=False):
  with Cluster("SPA Site"):
    cf = Cloudfront("Cloudfront")
    s3 = S3("static\nhosting")
    vreq = Lambda("Viewer\nRequest")
    oreq = Lambda("Origin\nRequest")
    api = APIGateway("Dynamic\nRendering\nAPI")

  users = Users("User")
  crawler = User("Crawler")

  users >> cf
  crawler >> cf
  cf >> vreq >> Edge(label="add header") >> oreq
  oreq >> Edge(label="if user") >> s3
  oreq >> Edge(label="if crawler") >> api >> Edge(label="as user") >> cf
