package demo;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Created by anthonyhayes on 12/10/14.
 */
@Controller
public class HomeController {

    @RequestMapping("/")
    public String home() {
        return "index";
    }
}
